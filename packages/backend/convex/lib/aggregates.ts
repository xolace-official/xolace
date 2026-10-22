import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import { DataModel, Doc, Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

/**
 * Sorted index over `emotional_profiles.sessionCount`.
 *
 * Powers the percentile card ("you've sat with more moments than 73% of
 * people here") without scanning the profiles table: rank and population are
 * both O(log n) reads.
 *
 * INVARIANT: every write to `emotional_profiles.sessionCount` — insert, patch,
 * or delete — must go through the sync helpers below, or the aggregate silently
 * drifts from the table and every user's percentile is wrong. There are five
 * such write sites today (users.getOrCreate, jobs/profileStats, jobs/dataWipe,
 * jobs/accountDeletion, devTools.setStreak). If that grows much past a handful,
 * switch to convex-helpers Triggers so the sync can't be forgotten.
 *
 * The helpers use the aggregate's tolerant writes (`insertIfDoesNotExist` /
 * `replaceOrInsert` / `deleteIfExists`) rather than the strict ones. The strict
 * variants throw when a profile's key isn't in the tree — which is the state
 * every pre-existing profile is in between deploying this and the backfill
 * finishing. With strict writes, the first session any existing user completes
 * in that window fails outright: `profileStats` patches the profile, calls
 * `replace`, throws, and the whole mutation rolls back. Deletion wedges the
 * same way. A percentile that is briefly off is a wrong number; a session
 * completion that throws is a broken app, so we take the wrong number.
 */
export const reflectionRank = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "emotional_profiles";
}>(components.reflectionRank, {
  sortKey: (doc) => doc.sessionCount,
});

/** Call immediately after inserting a new emotional_profiles row. */
export async function rankInsert(ctx: MutationCtx, profileId: Id<"emotional_profiles">) {
  const doc = await ctx.db.get("emotional_profiles", profileId);
  if (doc) await reflectionRank.insertIfDoesNotExist(ctx, doc);
}

/**
 * Call immediately after patching a profile, passing the doc as it was read
 * *before* the patch. Re-reads the fresh doc itself.
 */
export async function rankReplace(ctx: MutationCtx, oldDoc: Doc<"emotional_profiles">) {
  const newDoc = await ctx.db.get("emotional_profiles", oldDoc._id);
  if (newDoc) await reflectionRank.replaceOrInsert(ctx, oldDoc, newDoc);
}

/** Call *before* deleting the profile row — the doc must still exist. */
export async function rankDelete(ctx: MutationCtx, profileId: Id<"emotional_profiles">) {
  const doc = await ctx.db.get("emotional_profiles", profileId);
  if (doc) await reflectionRank.deleteIfExists(ctx, doc);
}
