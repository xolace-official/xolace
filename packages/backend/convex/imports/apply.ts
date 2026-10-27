import {
	vResultValidator,
	vWorkflowId,
	WorkflowManager,
} from "@convex-dev/workflow";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { validate } from "convex-helpers/validators";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	type MutationCtx,
} from "../_generated/server";
import { SAFETY_REVIEW_TIER } from "../admin/audio";
import {
	r2,
	upsertTopicRecord,
	upsertTrackRecord,
} from "../ai/paths/audioTracks";
import { assertImageAlts } from "../library/imageAlts";
import {
	upsertHubRecord,
	upsertSourceRecord,
	writeEntry,
} from "../library/write";
import { versionOf } from "./plan";
import {
	type ItemPayload,
	itemPayload,
	MAX_RECORDS,
	type RecordType,
} from "./records";

/**
 * Apply (admin v1 step 6c): one durable workflow per item, started a phase
 * at a time (sources, then entries, then hubs) so references inside a drop
 * resolve. Each workflow checks its uploads reached R2, then writes through
 * the same function as the ingest scripts. `finished` records the outcome,
 * or the step that failed, and starts the next phase when the last item of
 * this one settles.
 */

export const workflow = new WorkflowManager(components.workflow);

export const CHECK_STEP = "Check uploads";

export const UPSERT_STEP: Record<RecordType, string> = {
	entry: "Upsert entry",
	hub: "Upsert hub",
	narration: "Upsert narration",
	source: "Upsert source",
	topic: "Upsert topic",
	track: "Upsert track",
};

const settledStatus = v.union(
	v.literal("live"),
	v.literal("needs_review"),
	v.literal("draft"),
	v.literal("retired")
);
type SettledStatus = Infer<typeof settledStatus>;

const outcome = v.object({ status: settledStatus });

async function itemOf(ctx: MutationCtx, itemId: Id<"import_items">) {
	const item = await ctx.db.get("import_items", itemId);
	if (!item) {
		throw new ConvexError(`import item ${itemId} not found`);
	}
	return item;
}

export const begin = internalMutation({
	args: { itemId: v.id("import_items") },
	handler: async (ctx, { itemId }) => {
		const item = await itemOf(ctx, itemId);
		const uploads = item.uploads ?? [];
		await ctx.db.patch("import_items", itemId, {
			status: "processing",
			step: uploads.length > 0 ? CHECK_STEP : UPSERT_STEP[item.type],
		});
		return { uploads };
	},
	returns: v.object({
		uploads: v.array(v.object({ bytes: v.number(), key: v.string() })),
	}),
});

export const setStep = internalMutation({
	args: { itemId: v.id("import_items") },
	handler: async (ctx, { itemId }) => {
		const item = await itemOf(ctx, itemId);
		await ctx.db.patch("import_items", itemId, {
			step: UPSERT_STEP[item.type],
		});
		return null;
	},
	returns: v.null(),
});

/** The browser PUT each file before review; this confirms R2 has it, whole. */
export const checkUploads = internalAction({
	args: { uploads: v.array(v.object({ bytes: v.number(), key: v.string() })) },
	handler: async (ctx, { uploads }) => {
		for (const { bytes, key } of uploads) {
			const missing = new Error(
				`${key} never finished uploading. Start a new import with its file.`
			);
			try {
				await r2.syncMetadata(ctx, key);
			} catch {
				throw missing;
			}
			const meta = await r2.getMetadata(ctx, key);
			if (!meta) {
				throw missing;
			}
			if (meta.size !== undefined && meta.size !== bytes) {
				throw new Error(
					`${key} is ${meta.size} bytes in storage, not ${bytes}: the upload didn't finish. Start a new import with its file.`
				);
			}
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Compare saw the row at `baseVersion`. If it's moved on (an admin edit, a
 * script run, another import), writing this file would quietly undo that.
 */
function assertFresh(item: Doc<"import_items">, stored: object | null) {
	if (item.baseVersion === undefined) {
		if (stored) {
			throw new ConvexError(
				"Something with this slug was created after this import was compared. Start a new import to see the diff."
			);
		}
		return;
	}
	if (!stored || versionOf(stored) !== item.baseVersion) {
		throw new ConvexError(
			"Changed after this import was compared, so applying would overwrite that change. Start a new import to see the new diff."
		);
	}
}

function payloadOf(item: Doc<"import_items">): ItemPayload {
	const parsed: unknown = item.payload ? JSON.parse(item.payload) : undefined;
	if (!validate(itemPayload, parsed)) {
		throw new ConvexError(
			"This item's record no longer matches what imports write (the backend changed since the compare). Start a new import."
		);
	}
	return parsed;
}

const rowStatus = (row: {
	active: boolean;
	retiredAt?: number;
}): SettledStatus => {
	if (row.active) {
		return "live";
	}
	return row.retiredAt === undefined ? "draft" : "retired";
};

/** Writes the item through its type's shared write, and says where it landed. */
async function writeItem(
	ctx: MutationCtx,
	item: Doc<"import_items">,
	payload: ItemPayload
): Promise<SettledStatus> {
	switch (payload.type) {
		case "source": {
			assertFresh(
				item,
				await ctx.db
					.query("library_sources")
					.withIndex("by_slug", (q) => q.eq("slug", item.slug))
					.unique()
			);
			await upsertSourceRecord(ctx, payload.source);
			return "live";
		}
		case "entry": {
			const stored = await ctx.db
				.query("library_entries")
				.withIndex("by_slug", (q) => q.eq("slug", item.slug))
				.unique();
			assertFresh(item, stored);
			const { decorativeImages, facets, fields, markdown, sources } = payload;
			assertImageAlts(fields.slug, markdown, decorativeImages);
			const id = await writeEntry(
				ctx,
				stored,
				{ facets, fields, markdown, sources },
				{ strict: true }
			);
			const e = await ctx.db.get("library_entries", id);
			if (e?.kind === "explainer" && !e.active && !e.safetyReviewedAt) {
				return "needs_review";
			}
			return e ? rowStatus(e) : "draft";
		}
		case "hub": {
			const hub = () =>
				ctx.db
					.query("library_hubs")
					.withIndex("by_slug", (q) => q.eq("slug", item.slug))
					.unique();
			assertFresh(item, await hub());
			await upsertHubRecord(ctx, payload.hub);
			const h = await hub();
			return h ? rowStatus(h) : "draft";
		}
		case "track": {
			assertFresh(
				item,
				await ctx.db
					.query("audio_tracks")
					.withIndex("by_slug", (q) => q.eq("slug", item.slug))
					.unique()
			);
			const { trackId } = await upsertTrackRecord(ctx, payload.track);
			const t = await ctx.db.get("audio_tracks", trackId);
			if (
				t?.family === "support" &&
				!t.active &&
				(t.tier ?? 0) >= SAFETY_REVIEW_TIER &&
				!t.safetyReviewedAt
			) {
				return "needs_review";
			}
			return t ? rowStatus(t) : "draft";
		}
		case "topic": {
			assertFresh(
				item,
				await ctx.db
					.query("topics")
					.withIndex("by_slug", (q) => q.eq("slug", item.slug))
					.unique()
			);
			await upsertTopicRecord(ctx, payload.topic);
			return "live";
		}
		default: {
			const unknown: never = payload;
			throw new ConvexError(`can't apply ${JSON.stringify(unknown)}`);
		}
	}
}

export const upsert = internalMutation({
	args: { itemId: v.id("import_items") },
	handler: async (ctx, { itemId }) => {
		const item = await itemOf(ctx, itemId);
		return { status: await writeItem(ctx, item, payloadOf(item)) };
	},
	returns: outcome,
});

/** The workflow's steps, apart so tests can drive them without the component. */
export interface ItemSteps {
	runAction: <A extends FunctionReference<"action", "internal">>(
		action: A,
		args: FunctionArgs<A>,
		opts?: {
			retry?: { base: number; initialBackoffMs: number; maxAttempts: number };
		}
	) => Promise<FunctionReturnType<A>>;
	runMutation: <M extends FunctionReference<"mutation", "internal">>(
		mutation: M,
		args: FunctionArgs<M>
	) => Promise<FunctionReturnType<M>>;
}

/** Check the item's uploads arrived, then write it. */
export async function runItem(
	step: ItemSteps,
	itemId: Id<"import_items">
): Promise<Infer<typeof outcome>> {
	const { uploads } = await step.runMutation(internal.imports.apply.begin, {
		itemId,
	});
	if (uploads.length > 0) {
		await step.runAction(
			internal.imports.apply.checkUploads,
			{ uploads },
			{ retry: { base: 2, initialBackoffMs: 2000, maxAttempts: 3 } }
		);
		await step.runMutation(internal.imports.apply.setStep, { itemId });
	}
	return await step.runMutation(internal.imports.apply.upsert, { itemId });
}

export const importItem = workflow.define({
	args: { itemId: v.id("import_items") },
	handler: (step, { itemId }) => runItem(step, itemId),
	returns: outcome,
});

/** Starts an item's workflow; `finished` hears how it ends. */
export async function startItem(ctx: MutationCtx, itemId: Id<"import_items">) {
	const workflowId = await workflow.start(
		ctx,
		internal.imports.apply.importItem,
		{ itemId },
		{
			context: { itemId },
			onComplete: internal.imports.apply.finished,
			startAsync: true,
		}
	);
	await ctx.db.patch("import_items", itemId, { workflowId });
}

/**
 * With nothing in flight, starts every queued item of the lowest waiting
 * phase; with nothing queued, the run is done.
 */
export async function startNextPhase(
	ctx: MutationCtx,
	run: Doc<"import_runs">
) {
	const queued = await ctx.db
		.query("import_items")
		.withIndex("by_runId_and_status_and_phase", (q) =>
			q.eq("runId", run._id).eq("status", "queued")
		)
		.take(MAX_RECORDS);
	const [first] = queued;
	if (!first) {
		await ctx.db.patch("import_runs", run._id, {
			finishedAt: Date.now(),
			inFlight: 0,
			state: "done",
		});
		return;
	}
	const phase = queued.filter((item) => item.phase === first.phase);
	for (const item of phase) {
		await startItem(ctx, item._id);
	}
	await ctx.db.patch("import_runs", run._id, {
		inFlight: phase.length,
		state: "applying",
	});
}

/** The first line of a workflow error, without the runtime's wrapping. */
export function failureMessage(error: string) {
	const [line = error] = error.split("\n");
	return (
		line
			.replace(/^(?:Uncaught )?(?:ConvexError|Error):\s*/, "")
			.replace(/^\[Request ID: [^\]]+\]\s*/, "")
			.replace(/^Server Error\s*/, "")
			.trim() || "Something went wrong"
	);
}

export const finished = internalMutation({
	args: {
		context: v.object({ itemId: v.id("import_items") }),
		result: vResultValidator,
		workflowId: vWorkflowId,
	},
	handler: async (ctx, { context: { itemId }, result, workflowId }) => {
		const item = await ctx.db.get("import_items", itemId);
		const run = item && (await ctx.db.get("import_runs", item.runId));
		// A workflow a retry has since replaced has nothing to say.
		if (item && run && item.workflowId === workflowId) {
			if (result.kind === "success" && validate(outcome, result.returnValue)) {
				await ctx.db.patch("import_items", itemId, {
					failure: undefined,
					status: result.returnValue.status,
					step: undefined,
				});
			} else {
				await ctx.db.patch("import_items", itemId, {
					failure: {
						message:
							result.kind === "failed"
								? failureMessage(result.error)
								: "The workflow was canceled.",
						step: item.step ?? UPSERT_STEP[item.type],
					},
					status: "failed",
					step: undefined,
				});
			}
			const failed = run.failed + (result.kind === "success" ? 0 : 1);
			const inFlight = Math.max(0, run.inFlight - 1);
			await ctx.db.patch("import_runs", run._id, { failed, inFlight });
			if (inFlight === 0) {
				await startNextPhase(ctx, { ...run, failed, inFlight });
			}
		}
		await workflow.cleanup(ctx, workflowId);
		return null;
	},
	returns: v.null(),
});

/** Audio uploads are unique per compare; images are content-addressed and may be shared. */
const STAGED_AUDIO = /^(?:support|music)\//;

/** Drops staged audio no track points at: on discard, and for items left out. */
export async function dropStagedAudio(
	ctx: MutationCtx,
	items: readonly Doc<"import_items">[]
) {
	for (const item of items) {
		for (const { key } of item.uploads ?? []) {
			if (STAGED_AUDIO.test(key)) {
				await r2.deleteObject(ctx, key);
			}
		}
	}
}
