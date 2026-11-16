import { paginationOptsValidator } from "convex/server";
import { type ObjectType, v } from "convex/values";
import { type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { familyValidator, trackItems, trackItemValidator } from "./tracks";

/** Browsing one family's tracks (#339, docs/paths-v1.md §9.3). */

export const listByFamilyArgs = {
	family: familyValidator,
	paginationOpts: paginationOptsValidator,
};

export const trackPageValidator = v.object({
	continueCursor: v.string(),
	isDone: v.boolean(),
	page: v.array(trackItemValidator),
	pageStatus: v.optional(
		v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())
	),
	splitCursor: v.optional(v.union(v.string(), v.null())),
});

/** Per-family list — `active` rows only, page size chosen by the client (30). */
export async function listByFamilyCore(
	ctx: QueryCtx,
	args: ObjectType<typeof listByFamilyArgs>
) {
	await requireAuth(ctx);
	const result = await ctx.db
		.query("audio_tracks")
		.withIndex("by_family_and_active", (q) =>
			q.eq("family", args.family).eq("active", true)
		)
		.paginate(args.paginationOpts);
	return {
		...result,
		page: await Promise.all(result.page.map(trackItems(ctx))),
	};
}

export const listByFamily = query({
	args: listByFamilyArgs,
	handler: listByFamilyCore,
	returns: trackPageValidator,
});
