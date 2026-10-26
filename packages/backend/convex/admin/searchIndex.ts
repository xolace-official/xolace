import { getFunctionName } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";
import { EXERCISE_NAMESPACE } from "../ai/exercises/embed";
import { LIBRARY_NAMESPACE } from "../ai/library/embed";
import { trackNamespaces } from "../ai/paths/trackSearch";
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
	/** The namespace has more entries than were read; its counts are a floor. */
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

/** Ready keys in one namespace, read in one page. */
async function indexedKeys(ctx: QueryCtx, namespace: string) {
	const found = await rag.getNamespace(ctx, { namespace });
	if (!found) {
		return { keys: new Set<string>(), truncated: false };
	}
	const { page, isDone } = await rag.list(ctx, {
		limit: ADMIN_LIST_LIMIT,
		namespaceId: found.namespaceId,
	});
	const keys = new Set<string>();
	for (const { key } of page) {
		if (key) {
			keys.add(key);
		}
	}
	return { keys, truncated: !isDone };
}

const sample = (keys: string[], labels: ReadonlyMap<string, string>) =>
	keys
		.map((key) => ({ key, label: labels.get(key) ?? key }))
		.sort((a, b) => a.label.localeCompare(b.label))
		.slice(0, KEY_SAMPLE);

/**
 * One namespace against its source. `source` holds the keys that belong in it;
 * `labels` names every key a row still has (retired ones too), so a stale key
 * reads as a slug rather than an id where it can.
 */
async function compareNamespace(
	ctx: QueryCtx,
	namespace: string,
	source: ReadonlySet<string>,
	labels: ReadonlyMap<string, string>
): Promise<NamespaceRow> {
	const { keys, truncated } = await indexedKeys(ctx, namespace);
	const missing = [...source].filter((key) => !keys.has(key));
	const stale = [...keys].filter((key) => !source.has(key));
	return {
		indexed: keys.size,
		missing: sample(missing, labels),
		missingCount: missing.length,
		namespace,
		source: source.size,
		stale: sample(stale, labels),
		staleCount: stale.length,
		truncated,
	};
}

/** `track:<topic>` per topic, plus `track:reality-not-false-hope`; keyed on the slug. */
async function trackNamespaceRows(ctx: QueryCtx) {
	const tracks = await ctx.db.query("audio_tracks").take(ADMIN_LIST_LIMIT);
	const labels = new Map(tracks.map((t) => [t.slug, t.title]));
	// Retired tracks' namespaces too, so a topic that lost every track still shows its leftovers.
	const source = new Map<string, Set<string>>();
	for (const t of tracks) {
		for (const namespace of trackNamespaces(t)) {
			const slugs = source.get(namespace) ?? new Set<string>();
			if (t.active) {
				slugs.add(t.slug);
			}
			source.set(namespace, slugs);
		}
	}
	const namespaces = [...source.keys()].sort();
	return await Promise.all(
		namespaces.map((namespace) =>
			compareNamespace(
				ctx,
				namespace,
				source.get(namespace) ?? new Set(),
				labels
			)
		)
	);
}

/** Keyed on the entry id; labelled with its slug. */
async function libraryNamespaceRow(ctx: QueryCtx) {
	const entries = await ctx.db.query("library_entries").take(ADMIN_LIST_LIMIT);
	return await compareNamespace(
		ctx,
		LIBRARY_NAMESPACE,
		new Set(entries.filter((e) => e.active).map((e) => e._id)),
		new Map(entries.map((e) => [e._id, e.slug]))
	);
}

/** Keyed on the title. */
async function exerciseNamespaceRow(ctx: QueryCtx) {
	const exercises = await ctx.db.query("exercises").take(EXERCISE_LIMIT);
	return await compareNamespace(
		ctx,
		EXERCISE_NAMESPACE,
		new Set(exercises.filter((e) => e.active).map((e) => e.title)),
		new Map(exercises.map((e) => [e.title, e.title.replaceAll("_", " ")]))
	);
}

/**
 * Keyed on the emotional profile id. Belongs = what `xolacers/embed.textForIndex`
 * indexes: complete, active, with a bio.
 */
async function xolacerNamespaceRow(ctx: QueryCtx) {
	const xolacers = await ctx.db
		.query("xolacer_profiles")
		.take(ADMIN_LIST_LIMIT);
	return await compareNamespace(
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
		)
	);
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
		const [tracks, library, exercises, xolacers] = await Promise.all([
			trackNamespaceRows(ctx),
			libraryNamespaceRow(ctx),
			exerciseNamespaceRow(ctx),
			xolacerNamespaceRow(ctx),
		]);
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
				namespaces: [library],
			},
			{
				index: "exercises" as const,
				job: exerciseJob,
				migrations: [],
				namespaces: [exercises],
			},
			{
				index: "xolacers" as const,
				job: xolacerJob,
				migrations: [],
				namespaces: [xolacers],
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
