import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { purgeEpisodicEntries } from "../episodicMemory";
import { ACTIVE_STATUSES, cancelFollowUpWorkflow } from "../followUps";
import { deleteResponsesForCard } from "../followUpResponses";

/**
 * The reference graph for "what dies when a session dies."
 *
 * INVARIANT: every table with a `sessionId` field — or a `v.id()` pointing at
 * a table in this list (transitive: `path_steps` → `paths` → session) — is
 * either purged here or listed in SESSION_ID_EXEMPT with a reason.
 * `sessionCascade.test.ts` walks the schema and fails if a new one appears in
 * neither — the miss that left `follow_up_cards` orphaned by dataRetention
 * for three jobs' worth of drift.
 *
 * Callers: jobs/dataWipe, jobs/accountDeletion, jobs/dataRetention. Each used
 * to hand-roll this list; two of the three forgot follow-up cards.
 */
export const SESSION_CASCADE_TABLES = [
  "session_turns",
  "emotional_metadata",
  "follow_up_cards",
  "follow_up_responses",
  "paths",
  "path_steps",
  "talk_turns",
  "talk_conversations",
] as const;

/** Tables carrying a sessionId that intentionally outlive their session. */
export const SESSION_ID_EXEMPT = {
  escalation_events:
    "Safety-audit tombstone — retained (profileId stripped) even past account deletion; holds no user text by policy.",
  feedback:
    "Profile-scoped structural signal — anonymized in place on account deletion (owner link + text stripped), not cascaded with its session.",
  talk_charges:
    "An open talk-time reservation (#596), no text: it must still be released after its session is wiped. The talk-time sweeper removes it within ~2 h.",
} as const;

/**
 * Delete a batch of sessions and everything that hangs off them.
 *
 * Bounded by the caller: pass at most one transaction's worth of sessions.
 * Episodic entries are purged once for the whole batch (one namespace lookup)
 * before any row is deleted, so the embeddings never outlive their source.
 */
export async function purgeSessions(
  ctx: MutationCtx,
  emotionalProfileId: Id<"emotional_profiles">,
  sessions: Doc<"sessions">[],
): Promise<void> {
  if (sessions.length === 0) return;

  // Wipe parity (hard invariant): episodic embeddings die in the same
  // transaction that deletes the session rows — never a best-effort sidecar.
  await purgeEpisodicEntries(
    ctx,
    emotionalProfileId,
    sessions.map((s) => s._id),
  );

  // ElevenLabs' copies of a talk (#595, every conversation of it since #604):
  // the ids die with the rows, so their DELETE is scheduled in this same
  // transaction, before the purge commits.
  const conversationIds = new Set(
    sessions.flatMap((s) =>
      s.elevenLabsConversationId && !s.providerDeletedAt ? [s.elevenLabsConversationId] : [],
    ),
  );
  for (const session of sessions) {
    const conversations = await ctx.db
      .query("talk_conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(50);
    for (const c of conversations) {
      if (!c.providerDeletedAt) conversationIds.add(c.conversationId);
      await ctx.db.delete("talk_conversations", c._id);
    }
  }
  if (conversationIds.size) {
    await ctx.scheduler.runAfter(0, internal.talk.provider.deleteConversations, {
      conversationIds: [...conversationIds],
    });
  }

  for (const session of sessions) {
    // The TTS render of the user's own mirror — nothing else references this
    // blob, so it leaks into storage forever if we skip it.
    if (session.mirrorAudioStorageId) {
      await ctx.storage.delete(session.mirrorAudioStorageId);
    }

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .unique();
    if (metadata) await ctx.db.delete("emotional_metadata", metadata._id);

    // Server-capped at MAX_TURNS (sessionTurns.ts), but drain in batches
    // anyway so a cap change can't silently strand rows.
    let turns;
    do {
      turns = await ctx.db
        .query("session_turns")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(10);
      for (const turn of turns) await ctx.db.delete("session_turns", turn._id);
    } while (turns.length === 10);

    // A companion talk's transcript (#588): bounded by the talk ceiling, but
    // drain in batches all the same.
    let lines;
    do {
      lines = await ctx.db
        .query("talk_turns")
        .withIndex("by_session_and_seq", (q) => q.eq("sessionId", session._id))
        .take(100);
      for (const line of lines) await ctx.db.delete("talk_turns", line._id);
    } while (lines.length === 100);

    // One card per session at most, but query by index rather than assume.
    const cards = await ctx.db
      .query("follow_up_cards")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(10);
    for (const card of cards) {
      if (ACTIVE_STATUSES.has(card.status)) {
        await cancelFollowUpWorkflow(ctx, card.workflowId);
      }
      await deleteResponsesForCard(ctx, card._id);
      await ctx.db.delete("follow_up_cards", card._id);
    }

    // Kindling: twigs by pathId, then the paths row (docs/paths-v1.md §7).
    // One kindling per generating session; 2-3 twigs each.
    const paths = await ctx.db
      .query("paths")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(10);
    for (const path of paths) {
      const steps = await ctx.db
        .query("path_steps")
        .withIndex("by_path", (q) => q.eq("pathId", path._id))
        .take(10);
      for (const step of steps) await ctx.db.delete("path_steps", step._id);
      await ctx.db.delete("paths", path._id);
    }

    await ctx.db.delete("sessions", session._id);
  }
}
