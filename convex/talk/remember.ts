import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { recentUnderstandings } from "../understanding";
import { renderSemanticProfile } from "../semanticProfiles";
import { shapeIntakeSignals } from "../ai/intakeSignals";
import { searchEpisodicMemory } from "../ai/helpers/episodicSearch";
import { recallLine, renderMemory, renderRecall } from "./memory";

// Read at talk start: the companion's preload (#598, #580).
const RECENT_MOMENTS = 5;
// Each turn's recall: the person's last lines, the top hits.
const RECALL_LINES = 2;
// Far past the hits a 15-min talk can surface.
const MAX_SURFACED = 300;

const memoryOn = async (ctx: QueryCtx, profileId: Id<"emotional_profiles">) =>
  (
    await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
      .unique()
  )?.personalMemoryEnabled !== false;

/**
 * The talk's preload, plus whether recall runs. Memory off reads nothing of
 * the person; steadiness and insights are never read.
 */
export async function talkPreload(
  ctx: QueryCtx,
  profile: Doc<"emotional_profiles">,
  now: number,
): Promise<{ talkMemory: string; recall: boolean }> {
  if (!(await memoryOn(ctx, profile._id))) {
    return { talkMemory: renderMemory({ memoryOn: false, profile: null, moments: [], intake: null }, now), recall: false };
  }
  const semantic = profile.currentSemanticProfileId
    ? await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId)
    : null;
  const moments = [];
  for (const u of await recentUnderstandings(ctx, profile._id, RECENT_MOMENTS)) {
    const session = await ctx.db.get("sessions", u.sessionId);
    moments.push({ ...u, entryType: session?.entryType ?? "open_prompt" });
  }
  // First-timers only, as in buildSessionContext (ADR-0014).
  const intake =
    profile.sessionCount === 0
      ? shapeIntakeSignals(
          await ctx.db
            .query("intake_responses")
            .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
            .unique(),
        )
      : null;
  return {
    talkMemory: renderMemory(
      { memoryOn: true, profile: semantic ? renderSemanticProfile(semantic) : null, moments, intake },
      now,
    ),
    recall: true,
  };
}

/** The recall query: the person's last lines, when the talk ends on one. */
export function recallQuery(lines: { role: string; text: string }[]): string | null {
  if (lines.at(-1)?.role !== "person") return null;
  return lines
    .filter((l) => l.role === "person")
    .slice(-RECALL_LINES)
    .map((l) => l.text)
    .join("\n");
}

/**
 * The endpoint's per-turn read: the preload (cached prefix) and the latest
 * recall (after it). `sessionId` arrives from ElevenLabs, untrusted: nothing
 * comes back without the talk's key.
 */
export const forTurn = internalQuery({
  args: { sessionId: v.string(), talkKey: v.string() },
  returns: v.union(v.null(), v.object({ memory: v.string(), recall: v.string() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("sessions", args.sessionId);
    const session = id ? await ctx.db.get("sessions", id) : null;
    if (!session?.talkKey || session.talkKey !== args.talkKey) return null;
    // Turned off mid-talk: the companion stops knowing them at once.
    if (session.talkRecall && !(await memoryOn(ctx, session.emotionalProfileId))) return null;
    return { memory: session.talkMemory ?? "", recall: renderRecall(session.talkRecall?.lines ?? []) };
  },
});

export const recallTarget = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.union(v.null(), v.object({ profileId: v.id("emotional_profiles"), surfaced: v.array(v.string()) })),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get("sessions", sessionId);
    if (!session?.talkRecall || session.state !== "initiated") return null;
    // Turned off mid-talk: recall stops at once.
    if (!(await memoryOn(ctx, session.emotionalProfileId))) return null;
    return { profileId: session.emotionalProfileId, surfaced: session.talkRecall.surfaced };
  },
});

/** Scheduled by syncLines when the person speaks; its hits feed the next turn. */
export const recall = internalAction({
  args: { sessionId: v.id("sessions"), query: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId, query }) => {
    const target = await ctx.runQuery(internal.talk.remember.recallTarget, { sessionId });
    if (!target) return null;
    const { matches, failed } = await searchEpisodicMemory(ctx, target.profileId, sessionId, query, target.surfaced);
    // No hits clears the last ones too: a turn only hears what its own lines recalled.
    if (failed) return null;
    await ctx.runMutation(internal.talk.remember.storeRecall, { sessionId, matches });
    return null;
  },
});

export const storeRecall = internalMutation({
  args: { sessionId: v.id("sessions"), matches: v.array(v.object({ key: v.string(), text: v.string() })) },
  returns: v.null(),
  handler: async (ctx, { sessionId, matches }) => {
    const session = await ctx.db.get("sessions", sessionId);
    if (!session?.talkRecall || session.state !== "initiated") return null;
    const surfaced = new Set(session.talkRecall.surfaced);
    const lines = [];
    for (const m of matches) {
      // A concurrent recall surfaced it first.
      if (surfaced.has(m.key)) continue;
      surfaced.add(m.key);
      const pastId = ctx.db.normalizeId("sessions", m.key);
      const past = pastId ? await ctx.db.get("sessions", pastId) : null;
      const line = past && recallLine({ text: m.text, createdAt: past.createdAt, entryType: past.entryType }, Date.now());
      if (line) lines.push(line);
    }
    await ctx.db.patch("sessions", sessionId, {
      talkRecall: { lines, surfaced: [...surfaced].slice(-MAX_SURFACED) },
    });
    return null;
  },
});
