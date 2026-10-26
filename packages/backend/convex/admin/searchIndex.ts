import type { NamespaceId } from "@convex-dev/rag";
import { getFunctionName } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";
import { EXERCISE_NAMESPACE } from "../ai/exercises/embed";
import { LIBRARY_NAMESPACE } from "../ai/library/embed";
import { CATALOG } from "../ai/paths/catalog";
import { namespaceFor, trackNamespaces } from "../ai/paths/trackSearch";
import { XOLACER_NAMESPACE } from "../ai/xolacers/embed";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { BACKFILL_SPREAD_MS, migrations } from "../migrations";
import { rag } from "../rag";
import type schema from "../schema";
import { ADMIN_LIST_LIMIT } from "./edits";

/**
 * The meaning indexes (ADR 0021) for the admin's Search index page: each
 * namespace's source rows against the keys indexed in it, and a button per
 * index that starts its backfill. Until someone runs these on a deployment,
 * its namespaces stay empty and Kindling binds on nothing.
 *
 * Library and tracks backfill through the migrations runner (their searchText
 * step first, then the index step, which schedules one embed per row); the
 * exercises and xolacers re-index in one action each, recorded in
 * `search_index_jobs`. Every start only schedules and returns.
 */

const indexName = v.union(
	v.literal("tracks"),
	v.literal("library"),
	v.literal("exercises"),
	v.literal("xolacers")
);
type IndexName = Infer<typeof indexName>;
type JobIndex = Infer<
	typeof schema.tables.search_index_jobs.validator.fields.index
>;

/** Missing or stale keys listed per namespace; the counts stay whole. */
const KEY_SAMPLE = 50;

/** Exercises are a seeded handful (`exercises/embed.ts` reads 100). */
const EXERCISE_LIMIT = 100;

/** Each runs its searchText step, then the index step. Both are safe to re-run. */
const MIGRATION_SERIES = {
	library: [
		internal.migrations.backfillLibrarySearchText,
		internal.migrations.backfillLibraryIndex,
	],
	tracks: [
		internal.migrations.backfillTrackSearchText,
		internal.migrations.backfillTrackIndex,
	],
} as const;

const JOB_FUNCTION = {
	exercises: internal.ai.exercises.embed.indexExercises,
	xolacers: internal.ai.xolacers.embed.indexAll,
} as const;

const keyRow = v.object({ key: v.string(), label: v.string() });

const namespaceRow = v.object({
	/** Ready keys in the namespace. */
	indexed: v.number(),
	/** Rows that belong in it but aren't there, up to KEY_SAMPLE. */
	missing: v.array(keyRow),
	missingCount: v.number(),
	namespace: v.string(),
	/** Active rows that belong in it. */
	source: v.number(),
	/** Keys in it whose row is gone or retired, up to KEY_SAMPLE. */
	stale: v.array(keyRow),
	staleCount: v.number(),
	/** The index or its source had more rows than were read: missing and stale are unreliable. */
	truncated: v.boolean(),
});
type NamespaceRow = Infer<typeof namespaceRow>;

const migrationRow = v.object({
	error: v.optional(v.string()),
	isDone: v.boolean(),
	latestEnd: v.optional(v.number()),
	latestStart: v.number(),
	name: v.string(),
	processed: v.number(),
	state: v.union(
		v.literal("inProgress"),
		v.literal("success"),
		v.literal("failed"),
		v.literal("canceled"),
		v.literal("unknown")
	),
});

const jobState = v.union(
	v.literal("pending"),
	v.literal("inProgress"),
	v.literal("success"),
	v.literal("failed"),
	v.literal("canceled"),
	// The scheduled function's record has been cleaned up.
	v.literal("unknown")
);

const jobRow = v.object({
	error: v.optional(v.string()),
	finishedAt: v.optional(v.number()),
	startedAt: v.number(),
	startedByName: v.string(),
	state: jobState,
});
type JobRow = Infer<typeof jobRow>;

const indexRow = v.object({
	/**
	 * When the last index migration's spread-out embeds should all have run
	 * (its end + BACKFILL_SPREAD_MS); until then counts are still climbing.
	 */
	embedsUntil: v.optional(v.number()),
	index: indexName,
	/** The latest action re-index (exercises, xolacers); null if none was started here. */
	job: v.union(jobRow, v.null()),
	/** The migrations component's status of this index's series (library, tracks). */
	migrations: v.array(migrationRow),
	namespaces: v.array(namespaceRow),
});

/**
 * One namespace against its source. `source` holds the keys that belong in it;
 * `labels` names every key a row still has (retired ones too), so a stale key
 * reads as a slug rather than an id where it can. `truncated`: either side was
 * cut at its read cap, so missing and stale can't be trusted.
 */
interface Comparison {
	indexed: Set<string>;
	labels: ReadonlyMap<string, string>;
	namespace: string;
	namespaceId: NamespaceId | null;
	source: ReadonlySet<string>;
	truncated: boolean;
}

async function compare(
	ctx: QueryCtx,
	namespace: string,
	source: ReadonlySet<string>,
	labels: ReadonlyMap<string, string>,
	sourceTruncated: boolean
): Promise<Comparison> {
	const found = await rag.getNamespace(ctx, { namespace });
	const indexed = new Set<string>();
	let indexTruncated = false;
	if (found) {
		const { page, isDone } = await rag.list(ctx, {
			limit: ADMIN_LIST_LIMIT,
			namespaceId: found.namespaceId,
		});
		for (const { key } of page) {
			if (key) {
				indexed.add(key);
			}
		}
		indexTruncated = !isDone;
	}
	return {
		indexed,
		labels,
		namespace,
		namespaceId: found?.namespaceId ?? null,
		source,
		truncated: sourceTruncated || indexTruncated,
	};
}

const missingOf = (c: Comparison) =>
	[...c.source].filter((key) => !c.indexed.has(key));
const staleOf = (c: Comparison) =>
	[...c.indexed].filter((key) => !c.source.has(key));

const sample = (keys: string[], labels: ReadonlyMap<string, string>) =>
	keys
		.map((key) => ({ key, label: labels.get(key) ?? key }))
		.sort((a, b) => a.label.localeCompare(b.label))
		.slice(0, KEY_SAMPLE);

function toRow(c: Comparison): NamespaceRow {
	const missing = missingOf(c);
	const stale = staleOf(c);
	return {
		indexed: c.indexed.size,
		missing: sample(missing, c.labels),
		missingCount: missing.length,
		namespace: c.namespace,
		source: c.source.size,
		stale: sample(stale, c.labels),
		staleCount: stale.length,
		truncated: c.truncated,
	};
}

/**
 * Every namespace a track can live in: each catalog topic and the reframe
 * series, plus any topic a stored track names. A namespace a track moved out
 * of still shows while its key lingers.
 */
const CATALOG_TRACK_NAMESPACES = [
	...CATALOG.map((e) => namespaceFor(e.actionType)),
	namespaceFor("episode_reframe"),
].filter((ns) => ns !== null);

/** `track:<topic>` per topic, plus `track:reality-not-false-hope`; keyed on the slug. */
async function trackComparisons(ctx: QueryCtx) {
	const tracks = await ctx.db.query("audio_tracks").take(ADMIN_LIST_LIMIT);
	const cut = tracks.length === ADMIN_LIST_LIMIT;
	const labels = new Map(tracks.map((t) => [t.slug, t.title]));
	const source = new Map<string, Set<string>>(
		CATALOG_TRACK_NAMESPACES.map((ns) => [ns, new Set<string>()])
	);
	// Retired tracks' namespaces too, so a topic that lost every track still shows its leftovers.
	const named = new Set<string>();
	for (const t of tracks) {
		for (const namespace of trackNamespaces(t)) {
			named.add(namespace);
			const slugs = source.get(namespace) ?? new Set<string>();
			if (t.active) {
				slugs.add(t.slug);
			}
			source.set(namespace, slugs);
		}
	}
	const all = await Promise.all(
		[...source.keys()]
			.sort()
			.map((namespace) =>
				compare(ctx, namespace, source.get(namespace) ?? new Set(), labels, cut)
			)
	);
	// A catalog topic no track has ever used, with nothing indexed, is noise.
	return all.filter((c) => named.has(c.namespace) || c.indexed.size > 0);
}

/** Keyed on the entry id; labelled with its slug. */
async function libraryComparison(ctx: QueryCtx) {
	const entries = await ctx.db.query("library_entries").take(ADMIN_LIST_LIMIT);
	return await compare(
		ctx,
		LIBRARY_NAMESPACE,
		new Set(entries.filter((e) => e.active).map((e) => e._id)),
		new Map(entries.map((e) => [e._id, e.slug])),
		entries.length === ADMIN_LIST_LIMIT
	);
}

/** Keyed on the title. */
async function exerciseComparison(ctx: QueryCtx) {
	const exercises = await ctx.db.query("exercises").take(EXERCISE_LIMIT);
	return await compare(
		ctx,
		EXERCISE_NAMESPACE,
		new Set(exercises.filter((e) => e.active).map((e) => e.title)),
		new Map(exercises.map((e) => [e.title, e.title.replaceAll("_", " ")])),
		exercises.length === EXERCISE_LIMIT
	);
}

/**
 * Keyed on the emotional profile id. Belongs = what `xolacers/embed.textForIndex`
 * indexes: complete, active, with a bio.
 */
async function xolacerComparison(ctx: QueryCtx) {
	const xolacers = await ctx.db
		.query("xolacer_profiles")
		.take(ADMIN_LIST_LIMIT);
	return await compare(
		ctx,
		XOLACER_NAMESPACE,
		new Set(
			xolacers
				.filter((x) => x.complete && x.active && x.bio)
				.map((x) => x.emotionalProfileId)
		),
		new Map(
			xolacers.map((x) => [
				x.emotionalProfileId,
				x.displayName ?? x.emotionalProfileId,
			])
		),
		xolacers.length === ADMIN_LIST_LIMIT
	);
}

async function comparisonsFor(
	ctx: QueryCtx,
	index: IndexName
): Promise<Comparison[]> {
	if (index === "tracks") {
		return await trackComparisons(ctx);
	}
	if (index === "library") {
		return [await libraryComparison(ctx)];
	}
	if (index === "exercises") {
		return [await exerciseComparison(ctx)];
	}
	return [await xolacerComparison(ctx)];
}

/** The series' steps in run order (the component returns them reversed). */
async function seriesStatus(ctx: QueryCtx, index: "library" | "tracks") {
	const series = MIGRATION_SERIES[index].map((fn) => getFunctionName(fn));
	const statuses = await migrations.getStatus(ctx, { migrations: series });
	statuses.sort((a, b) => series.indexOf(a.name) - series.indexOf(b.name));
	return statuses.map((s) => ({
		error: s.error,
		isDone: s.isDone,
		latestEnd: s.latestEnd,
		latestStart: s.latestStart,
		name: s.name,
		processed: s.processed,
		state: s.state,
	}));
}

async function latestJob(
	ctx: QueryCtx,
	index: JobIndex
): Promise<JobRow | null> {
	const job = await ctx.db
		.query("search_index_jobs")
		.withIndex("by_index", (q) => q.eq("index", index))
		.order("desc")
		.first();
	if (!job) {
		return null;
	}
	const fn = await ctx.db.system.get("_scheduled_functions", job.jobId);
	return {
		error: fn?.state.kind === "failed" ? fn.state.error : undefined,
		finishedAt: fn?.completedTime,
		startedAt: job._creationTime,
		startedByName: job.startedByName,
		state: fn?.state.kind ?? "unknown",
	};
}

const isRunning = (state: JobRow["state"]) =>
	state === "pending" || state === "inProgress";

export const status = adminQuery({
	args: {},
	handler: async (ctx) => {
		const [tracks, library, exercises, xolacers] = await Promise.all(
			(["tracks", "library", "exercises", "xolacers"] as const).map(
				async (index) => (await comparisonsFor(ctx, index)).map(toRow)
			)
		);
		const [trackSeries, librarySeries, exerciseJob, xolacerJob] =
			await Promise.all([
				seriesStatus(ctx, "tracks"),
				seriesStatus(ctx, "library"),
				latestJob(ctx, "exercises"),
				latestJob(ctx, "xolacers"),
			]);
		// The index step is last in each series; its embeds trail it by up to the spread.
		const embedsUntil = (series: Infer<typeof migrationRow>[]) => {
			const end = series.at(-1)?.latestEnd;
			return end === undefined ? undefined : end + BACKFILL_SPREAD_MS;
		};
		return [
			{
				embedsUntil: embedsUntil(trackSeries),
				index: "tracks" as const,
				job: null,
				migrations: trackSeries,
				namespaces: tracks,
			},
			{
				embedsUntil: embedsUntil(librarySeries),
				index: "library" as const,
				job: null,
				migrations: librarySeries,
				namespaces: library,
			},
			{
				index: "exercises" as const,
				job: exerciseJob,
				migrations: [],
				namespaces: exercises,
			},
			{
				index: "xolacers" as const,
				job: xolacerJob,
				migrations: [],
				namespaces: xolacers,
			},
		];
	},
	returns: v.array(indexRow),
});

const alreadyRunning = (index: IndexName) =>
	new ConvexError(`The ${index} index is already backfilling`);

/**
 * Starts one index's backfill and returns at once. Library and tracks re-run
 * their migration series from the start (`reset`), so a series that finished
 * before still re-embeds every active row.
 */
export const start = adminMutation({
	args: { index: indexName },
	handler: async (ctx, { index }) => {
		if (index === "library" || index === "tracks") {
			const series = await seriesStatus(ctx, index);
			if (series.some((s) => s.state === "inProgress")) {
				throw alreadyRunning(index);
			}
			const [first, ...next] = MIGRATION_SERIES[index].map((fn) =>
				getFunctionName(fn)
			);
			await ctx.scheduler.runAfter(0, internal.migrations.run, {
				fn: first,
				next,
				reset: true,
			});
			return null;
		}
		const job = await latestJob(ctx, index);
		if (job && isRunning(job.state)) {
			throw alreadyRunning(index);
		}
		const jobId = await ctx.scheduler.runAfter(0, JOB_FUNCTION[index], {});
		const { identity } = ctx;
		await ctx.db.insert("search_index_jobs", {
			index,
			jobId,
			startedBy: identity.subject,
			startedByName: identity.name ?? identity.email ?? "Staff",
		});
		return null;
	},
	returns: v.null(),
});

/**
 * Drops every stale key of one index: keys still searchable after their row
 * was retired, deleted or moved to another topic. A backfill can't: library
 * and track backfills only visit active rows, and the xolacer one can't reach
 * a deleted profile. Removal needs no embed, so it costs nothing. Refused
 * while a read was capped, since a key past the cap would look stale.
 */
export const removeStale = adminMutation({
	args: { index: indexName },
	handler: async (ctx, { index }) => {
		const comparisons = await comparisonsFor(ctx, index);
		if (comparisons.some((c) => c.truncated)) {
			throw new ConvexError(
				`The ${index} index is too large to read whole here; nothing was removed`
			);
		}
		let removed = 0;
		for (const c of comparisons) {
			const { namespaceId } = c;
			if (namespaceId === null) {
				continue;
			}
			for (const key of staleOf(c)) {
				await rag.deleteByKeyAsync(ctx, { key, namespaceId });
				removed += 1;
			}
		}
		return removed;
	},
	returns: v.number(),
});
