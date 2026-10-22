import { v } from "convex/values";
import { internalQuery, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// =============================================================
// UNDERSTANDING — Cognition Layer Phase 2
// =============================================================
//
// Understanding = a verdict about one moment. Event-scoped, produced
// exactly once by the pipeline (process.ts → emotionalMetadata.store),
// then effectively frozen: "this session: grief masked as anger,
// intensity 7, no crisis signal, informed by these 3 memories and
// profile v12."
//
// Storage decision (locked): extend emotional_metadata, no new table —
// same lifecycle, same purge/wipe rules, same consumers. This module
// is the concept's front door, not a second store.
//
// THE CONSTITUTION RULE: no feature may call an LLM to re-derive
// something the Understanding already knows. All AI features take
// Understanding + Memory as input. New model calls are justified only
// for genuinely new signal (new modality, new artifact type), and all
// model calls live under convex/ai/.

/**
 * The complete per-session Understanding. Today this is exactly the
 * emotional_metadata row (classification + dimensions + safeguard
 * verdict + memory provenance). Kept as a named alias so consumers
 * depend on the concept, not the table — if Understanding ever needs
 * a divergent lifecycle, the split happens behind this type.
 */
export type Understanding = Doc<"emotional_metadata">;

/**
 * The only sanctioned read path for a session's Understanding.
 * Returns null when the pipeline hasn't classified the session yet
 * (or the row was purged by retention/wipe).
 */
export const getUnderstanding = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<Understanding | null> => understandingOf(ctx, args.sessionId),
});

/**
 * getUnderstanding as a helper, for queries and mutations that read it
 * inside their own transaction instead of paying a ctx.runQuery per session.
 */
export async function understandingOf(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
): Promise<Understanding | null> {
  return await ctx.db
    .query("emotional_metadata")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .unique();
}

/**
 * A profile's most recent Understandings, newest first — the sanctioned
 * by-profile read for features that take "recent Understanding" as input
 * (Lantern's For you, #409). A helper, not a query, so callers read it
 * inside their own transaction.
 */
export async function recentUnderstandings(
  ctx: QueryCtx,
  profileId: Id<"emotional_profiles">,
  limit: number,
): Promise<Understanding[]> {
  return await ctx.db
    .query("emotional_metadata")
    .withIndex("by_profile_createdAt", (q) => q.eq("emotionalProfileId", profileId))
    .order("desc")
    .take(limit);
}
