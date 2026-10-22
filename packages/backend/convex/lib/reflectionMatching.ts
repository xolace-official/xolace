import { QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { emotionFamily } from "./understandingVocab";

// =============================================================
// Peer-reflection matching helpers for reflections.matchForSession.
// The handler stays a thin orchestrator: semantic (Xolace+) first,
// topped up from the tag cascade to four results.
// =============================================================

/**
 * Resolve a session's precomputed semantic match ids to live docs,
 * dropping rows that were deleted or are no longer active. Returns []
 * when nothing was precomputed (embed not ready yet / failed).
 */
export async function loadSemanticMatches(
  ctx: QueryCtx,
  session: Doc<"sessions">,
): Promise<Doc<"reflections">[]> {
  if (!session.semanticMatchIds?.length) return [];
  const docs = await Promise.all(
    session.semanticMatchIds.map((id) => ctx.db.get("reflections", id)),
  );
  return docs.filter(
    (r): r is Doc<"reflections"> => r !== null && r.status === "active",
  );
}

/**
 * Tag-cascade matching: granular label first, broadened to the primary
 * emotion when thin, then filtered by intensity proximity (±3). Returns
 * the filtered candidates unsliced; the caller caps the final count.
 */
export async function matchByTags(
  ctx: QueryCtx,
  sessionId: Doc<"sessions">["_id"],
): Promise<Doc<"reflections">[]> {
  const metadata = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .unique();

  if (!metadata) {
    return [];
  }

  // Try granular match first
  const reflections = await ctx.db
    .query("reflections")
    .withIndex("by_granular", (q) =>
      q
        .eq("granularLabel", metadata.granularLabel ?? undefined)
        .eq("status", "active"),
    )
    .take(10);

  // Fall back to broad emotion match. A finer primary ("loneliness") also
  // matches older rows that carried it as a granular label, then its parent
  // ("sadness") — the pool predates the finer vocabulary (ADR 0018).
  if (reflections.length < 3) {
    const [emotion, ...parents] = emotionFamily(metadata.primaryEmotion);
    const broadMatches = [
      ...(await ctx.db
        .query("reflections")
        .withIndex("by_emotion", (q) => q.eq("primaryEmotion", emotion).eq("status", "active"))
        .take(10)),
      ...(parents.length > 0
        ? await ctx.db
            .query("reflections")
            .withIndex("by_granular", (q) => q.eq("granularLabel", emotion).eq("status", "active"))
            .take(10)
        : []),
    ];
    for (const parent of parents) {
      broadMatches.push(
        ...(await ctx.db
          .query("reflections")
          .withIndex("by_emotion", (q) => q.eq("primaryEmotion", parent).eq("status", "active"))
          .take(10)),
      );
    }

    // Merge without duplicates
    const existingIds = new Set(reflections.map((r) => r._id));
    for (const match of broadMatches) {
      if (!existingIds.has(match._id)) {
        existingIds.add(match._id);
        reflections.push(match);
      }
    }
  }

  // Filter by intensity proximity (within ±3 of session intensity)
  return reflections.filter(
    (r) => Math.abs(r.intensity - metadata.intensity) <= 3,
  );
}
