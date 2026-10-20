import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { validateSpaceName } from "../lib/spaceName";
import { seededDisplayName, validateDisplayName } from "../lib/displayName";
import { COMPANION_FALLBACK_NAME } from "../ai/prompts/companion";
import { resolveVoiceId, TALK_FALLBACK_VOICE, TALK_SPEED, VOICE_CATALOG } from "../lib/voices";

/**
 * The companion's rename tool (#601), run by our endpoint mid-talk. The name
 * is the space name, so it's saved there for good and on the talk, which
 * the next turn's prompt reads. `sessionId` is untrusted: the talk's key binds it.
 */
export const rename = internalMutation({
  args: { sessionId: v.string(), talkKey: v.string(), name: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), name: v.string() }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("sessions", args.sessionId);
    const session = id ? await ctx.db.get("sessions", id) : null;
    if (!session?.talkKey || session.talkKey !== args.talkKey || session.state !== "initiated") {
      return { ok: false as const, message: "This talk has ended." };
    }
    const result = validateSpaceName(args.name);
    if (!result.ok) return { ok: false as const, message: result.message };
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", session.emotionalProfileId))
      .unique();
    if (preferences) await ctx.db.patch("preferences", preferences._id, { spaceName: result.trimmed });
    await ctx.db.patch("sessions", session._id, { companionName: result.trimmed });
    return { ok: true as const, name: result.trimmed };
  },
});

/**
 * The companion's set_person_name tool (#602): what to call the person.
 * Shared overwrites their public displayName; private is a preferred name
 * only the companion uses. Either way the talk stops asking.
 */
export const setPersonName = internalMutation({
  args: { sessionId: v.string(), talkKey: v.string(), name: v.string(), shared: v.boolean() },
  returns: v.union(v.object({ ok: v.literal(true), name: v.string() }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("sessions", args.sessionId);
    const session = id ? await ctx.db.get("sessions", id) : null;
    if (!session?.talkKey || session.talkKey !== args.talkKey || session.state !== "initiated") {
      return { ok: false as const, message: "This talk has ended." };
    }
    const result = validateDisplayName(args.name);
    if (!result.ok) return { ok: false as const, message: result.message };
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", session.emotionalProfileId))
      .unique();
    if (preferences) {
      await ctx.db.patch("preferences", preferences._id, {
        ...(args.shared ? { displayName: result.trimmed, preferredName: undefined } : { preferredName: result.trimmed }),
        talkNameAsked: true,
      });
    }
    await ctx.db.patch("sessions", session._id, { personName: result.trimmed, askPersonName: false });
    return { ok: true as const, name: result.trimmed };
  },
});

/** Later talks don't ask the person's name again (#602). */
export async function markNameAsked(ctx: MutationCtx, profileId: Id<"emotional_profiles">) {
  const preferences = await ctx.db
    .query("preferences")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
    .unique();
  if (preferences && !preferences.talkNameAsked) await ctx.db.patch("preferences", preferences._id, { talkNameAsked: true });
}

/**
 * The companion's "slow_down" tool (#603): they asked it to slow down
 * mid-talk. Speed is fixed for a talk, so this one gets shorter lines and
 * [slow]; the slower pace is saved for the next.
 */
export const slowDown = internalMutation({
  args: { sessionId: v.string(), talkKey: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), message: v.string() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("sessions", args.sessionId);
    const session = id ? await ctx.db.get("sessions", id) : null;
    if (!session?.talkKey || session.talkKey !== args.talkKey || session.state !== "initiated") {
      return { ok: false as const, message: "This talk has ended." };
    }
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", session.emotionalProfileId))
      .unique();
    if (preferences) await ctx.db.patch("preferences", preferences._id, { talkPace: "slower" });
    await ctx.db.patch("sessions", session._id, { talkSlowed: true });
    return { ok: true as const };
  },
});

/**
 * Who's talking and how it sounds, read at talk start (#601, #602, #603).
 * `session` is snapshot on the talk; voice and speed go to the client once,
 * as the agent's per-talk overrides.
 */
export async function talkSetup(ctx: MutationCtx, profileId: Id<"emotional_profiles">) {
  const preferences = await ctx.db
    .query("preferences")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
    .unique();
  return {
    session: {
      // A name saved before the deny list (#601) is re-checked here.
      companionName:
        preferences?.spaceName && validateSpaceName(preferences.spaceName).ok ? preferences.spaceName : COMPANION_FALLBACK_NAME,
      // Never a Clerk name (#602): the private name, else displayName.
      personName: preferences?.preferredName ?? preferences?.displayName ?? seededDisplayName(profileId),
      askPersonName: !preferences?.talkNameAsked,
      talkDirectness: preferences?.talkDirectness,
    },
    voiceId: resolveVoiceId(
      preferences?.talkVoice ?? preferences?.voice,
      VOICE_CATALOG[TALK_FALLBACK_VOICE].elevenLabsId,
    ),
    speed: TALK_SPEED[preferences?.talkPace ?? "normal"],
  };
}
