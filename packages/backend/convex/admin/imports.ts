import { ConvexError, type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import { dropStagedAudio, startItem, startNextPhase } from "../imports/apply";
import { compareDrop } from "../imports/compare";
import {
	dropRecord,
	importTarget,
	MAX_RECORDS,
	PHASE,
} from "../imports/records";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import schema from "../schema";

/**
 * Bulk imports for the admin (admin v1 step 6c). Compare stores a run and
 * mints upload URLs for the media it needs; the browser PUTs them and calls
 * `uploaded`; the reviewer leaves items out, then applies or discards it.
 * Apply runs one workflow per item (`imports/apply.ts`).
 */

const RECENT_RUNS = 50;
const MAX_FILES_LABEL = 200;

const runFields = schema.tables.import_runs.validator.fields;
const itemFields = schema.tables.import_items.validator.fields;

const runSummary = v.object({
	appliedAt: runFields.appliedAt,
	counts: runFields.counts,
	createdAt: v.number(),
	createdByName: v.string(),
	failed: v.number(),
	files: v.string(),
	finishedAt: runFields.finishedAt,
	number: v.number(),
	state: runFields.state,
	target: runFields.target,
});

const itemRow = v.object({
	action: itemFields.action,
	attempt: itemFields.attempt,
	changes: itemFields.changes,
	failure: itemFields.failure,
	id: v.id("import_items"),
	media: itemFields.media,
	rejection: itemFields.rejection,
	skipped: v.boolean(),
	slug: v.string(),
	status: itemFields.status,
	step: itemFields.step,
	title: v.string(),
	type: itemFields.type,
	warnings: itemFields.warnings,
});

const toSummary = (run: Doc<"import_runs">): Infer<typeof runSummary> => ({
	appliedAt: run.appliedAt,
	counts: run.counts,
	createdAt: run._creationTime,
	createdByName: run.createdByName,
	failed: run.failed,
	files: run.files,
	finishedAt: run.finishedAt,
	number: run.number,
	state: run.state,
	target: run.target,
});

async function runByNumber(ctx: QueryCtx, number: number) {
	const run = await ctx.db
		.query("import_runs")
		.withIndex("by_number", (q) => q.eq("number", number))
		.unique();
	if (!run) {
		throw new ConvexError(`Import #${number} not found`);
	}
	return run;
}

const itemsOf = (ctx: QueryCtx, run: Doc<"import_runs">) =>
	ctx.db
		.query("import_items")
		.withIndex("by_runId_and_status_and_phase", (q) => q.eq("runId", run._id))
		.take(MAX_RECORDS);

function assertState(
	run: Doc<"import_runs">,
	states: readonly Doc<"import_runs">["state"][],
	doing: string
) {
	if (!states.includes(run.state)) {
		throw new ConvexError(
			`Import #${run.number} is ${run.state}, so it can't ${doing}`
		);
	}
}

const applies = (item: Doc<"import_items">) =>
	item.action === "new" || item.action === "changed";

/** The latest imports, newest first. */
export const list = adminQuery({
	args: {},
	handler: async (ctx) =>
		(
			await ctx.db
				.query("import_runs")
				.withIndex("by_number")
				.order("desc")
				.take(RECENT_RUNS)
		).map(toSummary),
	returns: v.array(runSummary),
});

/** One run with every item: its diff in review, its progress once applied. Null for an unknown number. */
export const get = adminQuery({
	args: { number: v.number() },
	handler: async (ctx, { number }) => {
		const run = await ctx.db
			.query("import_runs")
			.withIndex("by_number", (q) => q.eq("number", number))
			.unique();
		if (!run) {
			return null;
		}
		const items = await itemsOf(ctx, run);
		return {
			...toSummary(run),
			items: items
				.sort((a, b) => a.phase - b.phase || a._creationTime - b._creationTime)
				.map((item) => ({
					action: item.action,
					attempt: item.attempt,
					changes: item.changes,
					failure: item.failure,
					id: item._id,
					media: item.media,
					rejection: item.rejection,
					skipped: item.skipped,
					slug: item.slug,
					status: item.status,
					step: item.step,
					title: item.title,
					type: item.type,
					warnings: item.warnings,
				})),
		};
	},
	returns: v.union(
		v.null(),
		v.object({ ...runSummary.fields, items: v.array(itemRow) })
	),
});

/**
 * Compare a drop with what's stored and keep the result as a new run. The
 * returned uploads are the files to PUT (record index, and which of its
 * files), then call `uploaded`; with none, the run is already in review.
 */
export const compare = adminMutation({
	args: {
		/** What was dropped, for the list: "4 JSON, 6 markdown, 6 media". */
		files: v.string(),
		records: v.array(dropRecord),
		target: importTarget,
	},
	handler: async (ctx, { files, records, target }) => {
		if (files.length > MAX_FILES_LABEL) {
			throw new ConvexError("The files label is too long");
		}
		const { items, uploads } = await compareDrop(ctx, target, records);
		const counts = { changed: 0, new: 0, rejected: 0, unchanged: 0 };
		for (const item of items) {
			counts[item.action] += 1;
		}
		const last = await ctx.db
			.query("import_runs")
			.withIndex("by_number")
			.order("desc")
			.first();
		const number = (last?.number ?? 0) + 1;
		const { identity } = ctx;
		const runId = await ctx.db.insert("import_runs", {
			counts,
			createdBy: identity.subject,
			createdByName: identity.name ?? identity.email ?? "Staff",
			failed: 0,
			files,
			inFlight: 0,
			number,
			state: uploads.length > 0 ? "uploading" : "review",
			target,
		});
		for (const { payload, ...item } of items) {
			await ctx.db.insert("import_items", {
				...item,
				payload: payload && JSON.stringify(payload),
				phase: PHASE[item.type],
				runId,
			});
		}
		return {
			number,
			uploads: await Promise.all(
				uploads.map(async ({ index, key, part }) => ({
					index,
					part,
					url: (await r2.generateUploadUrl(key)).url,
				}))
			),
		};
	},
	returns: v.object({
		number: v.number(),
		uploads: v.array(
			v.object({
				index: v.number(),
				part: v.union(v.literal("audio"), v.number()),
				url: v.string(),
			})
		),
	}),
});

/** The browser has PUT every file compare asked for: the run is ready to review. */
export const uploaded = adminMutation({
	args: { number: v.number() },
	handler: async (ctx, { number }) => {
		const run = await runByNumber(ctx, number);
		assertState(run, ["uploading", "review"], "finish uploading");
		await ctx.db.patch("import_runs", run._id, { state: "review" });
		return null;
	},
	returns: v.null(),
});

/** Leave items out of (or back in) a run under review. Only new and changed items apply. */
export const setSkipped = adminMutation({
	args: {
		itemIds: v.array(v.id("import_items")),
		number: v.number(),
		skipped: v.boolean(),
	},
	handler: async (ctx, { itemIds, number, skipped }) => {
		const run = await runByNumber(ctx, number);
		assertState(run, ["review"], "change what it includes");
		for (const itemId of itemIds) {
			const item = await ctx.db.get("import_items", itemId);
			if (!(item?.runId === run._id && applies(item))) {
				throw new ConvexError(`That item isn't one import #${number} applies`);
			}
			await ctx.db.patch("import_items", itemId, { skipped });
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Apply a reviewed run: every included new and changed item is queued, and
 * the first phase starts. Files staged for items left out are dropped.
 */
export const apply = adminMutation({
	args: { number: v.number() },
	handler: async (ctx, { number }) => {
		const run = await runByNumber(ctx, number);
		assertState(run, ["review"], "be applied");
		const items = await itemsOf(ctx, run);
		for (const item of items.filter(applies)) {
			if (item.skipped) {
				await dropStagedAudio(ctx, [item]);
			} else {
				await ctx.db.patch("import_items", item._id, {
					attempt: 1,
					status: "queued",
				});
			}
		}
		await ctx.db.patch("import_runs", run._id, {
			appliedAt: Date.now(),
			state: "applying",
		});
		await startNextPhase(ctx, run);
		return null;
	},
	returns: v.null(),
});

/** Run a failed item again from the start. It re-checks its row hasn't moved on. */
export const retry = adminMutation({
	args: { itemId: v.id("import_items"), number: v.number() },
	handler: async (ctx, { itemId, number }) => {
		const run = await runByNumber(ctx, number);
		assertState(run, ["applying", "done"], "retry an item");
		const item = await ctx.db.get("import_items", itemId);
		if (!(item?.runId === run._id && item.status === "failed")) {
			throw new ConvexError(`That item hasn't failed in import #${number}`);
		}
		await ctx.db.patch("import_items", itemId, {
			attempt: (item.attempt ?? 1) + 1,
			failure: undefined,
			status: "queued",
			step: undefined,
		});
		await startItem(ctx, itemId);
		await ctx.db.patch("import_runs", run._id, {
			failed: Math.max(0, run.failed - 1),
			finishedAt: undefined,
			inFlight: run.inFlight + 1,
			state: "applying",
		});
		return null;
	},
	returns: v.null(),
});

/** Throw away a run before it's applied, and the audio it staged. Nothing was written. */
export const discard = adminMutation({
	args: { number: v.number() },
	handler: async (ctx, { number }) => {
		const run = await runByNumber(ctx, number);
		assertState(run, ["uploading", "review"], "be discarded");
		await dropStagedAudio(ctx, await itemsOf(ctx, run));
		await ctx.db.patch("import_runs", run._id, { state: "discarded" });
		return null;
	},
	returns: v.null(),
});
