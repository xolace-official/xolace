import { ConvexError, v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { assertPublishable } from "./ingest";

/**
 * One-off curator mutations (#406), run by hand — never part of ingest and
 * not wired to any UI:
 *
 *   npx convex run library/admin:setActive '{"slug":"exam-stress","active":false}' [--prod]
 *   npx convex run library/admin:markSafetyReviewed '{"slug":"what-is-panic"}' [--prod]
 *
 * `setActive` is the urgent unpublish/republish path (#404) — reversible,
 * never a delete; readers who saved or started the entry keep read-only
 * access. Flip `active` in the manifest too: an unchanged manifest re-run
 * is a no-op, but the next edit to that record re-applies its `active`.
 *
 * `markSafetyReviewed` records the human reviewer's sign-off on an
 * explainer's current body; ingest can then publish it with `active: true`.
 */

async function bySlug(ctx: MutationCtx, slug: string) {
  const e = await ctx.db
    .query("library_entries")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (!e) throw new ConvexError(`library entry "${slug}" not found`);
  return e;
}

export const setActive = internalMutation({
  args: { slug: v.string(), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { slug, active }) => {
    const e = await bySlug(ctx, slug);
    assertPublishable({ ...e, active });
    await ctx.db.patch("library_entries", e._id, { active });
    // Retired leaves the meaning index; republished comes back (#568).
    await ctx.scheduler.runAfter(0, internal.library.embed.indexEntry, { entryId: e._id });
    return null;
  },
});

export const markSafetyReviewed = internalMutation({
  args: { slug: v.string() },
  returns: v.null(),
  handler: async (ctx, { slug }) => {
    const e = await bySlug(ctx, slug);
    if (e.kind !== "explainer") throw new ConvexError(`library entry "${slug}" is a ${e.kind}, not an explainer`);
    await ctx.db.patch("library_entries", e._id, { safetyReviewedAt: Date.now() });
    return null;
  },
});
