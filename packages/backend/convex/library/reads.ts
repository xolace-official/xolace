import {
	paginationOptsValidator,
	paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "../_generated/server";
import { awardReadRungs } from "../achievements/ladders";
import { requireAuth } from "../lib/auth";
import { LIBRARY_HELPED_FLOOR } from "../lib/shared";
import { recordActivity } from "../streaks/activityLog";
import { listenMin } from "./audio";
import { cardItemValidator } from "./cards";
import { toListItem } from "./entries";

/**
 * What a reader leaves behind on an entry (#410, CONTEXT.md "Library:
 * finished, helped, saved"). The row is private; only the totals in
 * `library_entry_totals` are ever shown to others (ADR 0016).
 */

/** "N found this helpful" stays hidden below this, so a small count can't point at anyone. */
export const HELPED_FLOOR = LIBRARY_HELPED_FLOOR;
// Unfinished reads walked to find Continue; past this many retracted/unstarted in a row, there's none.
const CONTINUE_SCAN = 50;
// Saved rows read per page, whatever the client asks for.
const SAVED_PAGE_MAX = 100;

type EntryId = Id<"library_entries">;
type ProfileId = Id<"emotional_profiles">;

export const readRow = (
	ctx: QueryCtx,
	profileId: ProfileId,
	entryId: EntryId
) =>
	ctx.db
		.query("library_reads")
		.withIndex("by_emotionalProfileId_and_entryId", (q) =>
			q.eq("emotionalProfileId", profileId).eq("entryId", entryId)
		)
		.unique();

const totalsRow = (ctx: QueryCtx, entryId: EntryId) =>
	ctx.db
		.query("library_entry_totals")
		.withIndex("by_entryId", (q) => q.eq("entryId", entryId))
		.unique();

async function bumpTotals(
	ctx: MutationCtx,
	entryId: EntryId,
	delta: { views?: number; helped?: number }
) {
	const t = await totalsRow(ctx, entryId);
	const views = Math.max(0, (t?.views ?? 0) + (delta.views ?? 0));
	const helped = Math.max(0, (t?.helped ?? 0) + (delta.helped ?? 0));
	if (t) {
		await ctx.db.patch("library_entry_totals", t._id, { helped, views });
	} else {
		await ctx.db.insert("library_entry_totals", { entryId, helped, views });
	}
}

type CardSignals = {
	// Optional in the type, as in `cardItemValidator`, so client types built on
	// a card still accept the list items that carry no read mark (`getNext`).
	finished?: boolean;
	listenMin: number | undefined;
	position?: number | undefined;
	saved: boolean;
	views: number;
};

/**
 * Views, listen time (#411), and this reader's saved state and read mark, for
 * every entry card. `finished` and `position` come off the same read row as
 * `saved`, so the mark costs no extra read. Pass the row when the caller
 * already has it (Saved walks them) to skip that read too.
 */
export async function cardSignals(
	ctx: QueryCtx,
	profileId: ProfileId,
	entryId: EntryId,
	known?: Doc<"library_reads">
): Promise<CardSignals> {
	const [t, r, listen] = await Promise.all([
		totalsRow(ctx, entryId),
		known ?? readRow(ctx, profileId, entryId),
		listenMin(ctx, entryId),
	]);
	return {
		finished: r?.finishedAt !== undefined,
		listenMin: listen,
		position: r?.position,
		saved: r?.saved ?? false,
		views: t?.views ?? 0,
	};
}

/** Attaches `cardSignals` to already-shaped list items. */
export const withCardSignals = <T extends { _id: EntryId }>(
	ctx: QueryCtx,
	profileId: ProfileId,
	items: T[]
) =>
	Promise.all(
		items.map(async (i) => ({
			...i,
			...(await cardSignals(ctx, profileId, i._id)),
		}))
	);

/**
 * Continue reading (#419): the most recently read entry that's in progress
 * and still listed. Drops out on finish; rows from before `lastReadAt` wait
 * until they're next read.
 */
export async function continueReading(
	ctx: QueryCtx,
	profileId: ProfileId,
	active: Map<EntryId, Doc<"library_entries">>
) {
	// Finished rows are outside the index range, so they can't crowd out an older in-progress read.
	const reads = await ctx.db
		.query("library_reads")
		.withIndex("by_emotionalProfileId_and_finishedAt_and_lastReadAt", (q) =>
			q
				.eq("emotionalProfileId", profileId)
				.eq("finishedAt", undefined)
				.gt("lastReadAt", 0)
		)
		.order("desc")
		.take(CONTINUE_SCAN);
	const r = reads.find((r) => (r.position ?? 0) > 0 && active.has(r.entryId));
	if (!r) {
		return null;
	}
	return {
		...(await toListItem(active.get(r.entryId)!)),
		...(await cardSignals(ctx, profileId, r.entryId)),
		position: r.position!,
	};
}

/**
 * Saved (Lantern): this reader's saved entries, newest saved first, as the
 * same cards every other list returns. Retracted entries drop out like they do
 * from every list; a page can come back short because of them. Rows saved
 * before `savedAt` existed follow the dated ones until
 * `migrations:backfillLibrarySavedAt` runs.
 */
export const listSaved = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		// v.number() lets NaN and ±Infinity through, and paginate throws on them.
		const asked = args.paginationOpts.numItems;
		const numItems = Number.isFinite(asked)
			? Math.max(1, Math.min(Math.floor(asked), SAVED_PAGE_MAX))
			: SAVED_PAGE_MAX;
		const result = await ctx.db
			.query("library_reads")
			.withIndex("by_emotionalProfileId_and_saved_and_savedAt", (q) =>
				q.eq("emotionalProfileId", profile._id).eq("saved", true)
			)
			.order("desc")
			.paginate({ ...args.paginationOpts, numItems });
		const cards = await Promise.all(
			result.page.map(async (r) => {
				const e = await ctx.db.get("library_entries", r.entryId);
				if (!e?.active) {
					return null;
				}
				const [item, signals] = await Promise.all([
					toListItem(e),
					cardSignals(ctx, profile._id, e._id, r),
				]);
				return { ...item, ...signals };
			})
		);
		return { ...result, page: cards.filter((c) => c !== null) };
	},
	returns: paginationResultValidator(cardItemValidator),
});

/** The reader's own row plus the end-of-read total. */
export const getReaderState = query({
	args: { entryId: v.id("library_entries") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const [r, t] = await Promise.all([
			readRow(ctx, profile._id, args.entryId),
			totalsRow(ctx, args.entryId),
		]);
		const helpedCount = t?.helped ?? 0;
		return {
			finished: r?.finishedAt !== undefined,
			helped: r?.helped ?? false,
			helpedCount: helpedCount >= HELPED_FLOOR ? helpedCount : null,
			position: r?.position ?? null,
			saved: r?.saved ?? false,
		};
	},
	returns: v.object({
		finished: v.boolean(),
		helped: v.boolean(),
		helpedCount: v.union(v.null(), v.number()), // null below HELPED_FLOOR
		position: v.union(v.null(), v.number()),
		saved: v.boolean(),
	}),
});

/**
 * The one write. `opened` is the reader opening: the first one is the view,
 * later ones never count again — and saving from a card isn't a view.
 * `finished` is one-way — the reader decides it (end reached + dwell), never
 * a button.
 */
export const record = mutation({
	args: {
		entryId: v.id("library_entries"),
		finished: v.optional(v.literal(true)),
		helped: v.optional(v.boolean()),
		opened: v.optional(v.literal(true)),
		position: v.optional(v.number()),
		saved: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const entry = await ctx.db.get("library_entries", args.entryId);
		if (!entry) {
			throw new Error("Library entry not found");
		}

		let row: Doc<"library_reads"> | null = await readRow(
			ctx,
			profile._id,
			args.entryId
		);
		if (!row) {
			// A retracted entry only stays open to its existing readers — a new row would unlock it in getEntry.
			if (!entry.active) {
				throw new Error("Library entry not found");
			}
			const id = await ctx.db.insert("library_reads", {
				emotionalProfileId: profile._id,
				entryId: args.entryId,
				helped: false,
				saved: false,
			});
			row = (await ctx.db.get("library_reads", id))!;
		}

		// Read-only once retracted (#404): no new view, save or helped — only the
		// reader's private progress, and unsaving. Dropped, not thrown: the reader
		// sends `opened` on every open.
		if (!entry.active) {
			const { entryId, position, finished, saved } = args;
			args = {
				entryId,
				finished,
				position,
				saved: saved === false ? false : undefined,
			};
		}

		const patch: Partial<Doc<"library_reads">> = {};
		if (args.opened && row.viewedAt === undefined) {
			patch.viewedAt = Date.now();
			await bumpTotals(ctx, args.entryId, { views: 1 });
		}
		if (args.position !== undefined) {
			patch.position = Math.min(Math.max(args.position, 0), 1);
		}
		// Only in-progress opens count, so quick peeks can't push Continue out of CONTINUE_SCAN.
		const inProgress = (row.position ?? 0) > 0 && row.finishedAt === undefined;
		if (args.position !== undefined || (args.opened && inProgress)) {
			patch.lastReadAt = Date.now();
		}
		if (args.finished && row.finishedAt === undefined) {
			patch.finishedAt = Date.now();
			await recordActivity(ctx, {
				actionType: "library",
				emotionalProfileId: profile._id,
			});
		}
		if (args.saved !== undefined) {
			patch.saved = args.saved;
			// Saving again keeps its place in Saved; unsaving clears it.
			if (args.saved && !row.saved) {
				patch.savedAt = Date.now();
			} else if (!args.saved && row.savedAt !== undefined) {
				patch.savedAt = undefined;
			}
		}
		if (args.helped !== undefined && args.helped !== row.helped) {
			patch.helped = args.helped;
			await bumpTotals(ctx, args.entryId, { helped: args.helped ? 1 : -1 });
		}
		if (Object.keys(patch).length > 0) {
			await ctx.db.patch("library_reads", row._id, patch);
		}
		// Counted once the finish is written, so this piece is in the count.
		if (patch.finishedAt !== undefined) {
			await awardReadRungs(ctx, profile._id, patch.finishedAt);
		}
		return null;
	},
	returns: v.null(),
});
