/**
 * Read-time derivation of a session's claim strength
 * (docs/confidence-aware-mirroring.md §6, "build notes").
 *
 * Claim strength is never persisted — it is a pure function of the
 * Understanding plus session state, so the client-facing session query
 * re-derives it through the same single gate the mirror was built with
 * (`routeClaimStrength`). The action row keys the "Recommended" pill off it.
 */

import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { routeClaimStrength, type ClaimStrength } from "../ai/routing";
import { localDay } from "../ai/context";
import { MAX_TURNS } from "../sessionTurns";

/**
 * Null until the session has been classified — before that there is no mirror
 * on screen and nothing to claim.
 */
export async function deriveClaimStrength(
  ctx: QueryCtx,
  session: Doc<"sessions">,
): Promise<ClaimStrength | null> {
  const metadata = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .unique();
  if (!metadata) return null;

  const turns = await ctx.db
    .query("session_turns")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .take(MAX_TURNS + 1);

  const gapNamedThisSession = session.gapNamed === true;

  // The same-day guard (§3.7) is ignored once this session has itself reached,
  // so skip both of its reads in that case rather than pay for an input that
  // cannot change the answer.
  let profileReachedToday = false;
  if (!gapNamedThisSession) {
    const [preferences, reachedSessions] = await Promise.all([
      ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) =>
          q.eq("emotionalProfileId", session.emotionalProfileId),
        )
        .unique(),
      ctx.db
        .query("sessions")
        .withIndex("by_profile_gapNamed", (q) =>
          q.eq("emotionalProfileId", session.emotionalProfileId).eq("gapNamed", true),
        )
        .order("desc")
        .take(2),
    ]);
    const timezone = preferences?.notifications.timezone;
    const today = localDay(Date.now(), timezone);
    profileReachedToday = reachedSessions.some(
      (s) => s._id !== session._id && localDay(s.createdAt, timezone) === today,
    );
  }

  return routeClaimStrength({
    confidence: metadata.primaryEmotionConfidence,
    specificity: metadata.specificity,
    episodicTopScore: metadata.episodicTopScore,
    entryType: session.entryType ?? "open_prompt",
    isEscalation: session.escalationTriggered === true,
    profileReachedToday,
    gapNamedThisSession,
    atCap: turns.length >= MAX_TURNS,
    userFeedback: turns[turns.length - 1]?.userFeedback,
  });
}
