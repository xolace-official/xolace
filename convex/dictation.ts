import { ConvexError, v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { transcribeAudio } from "./ai/transcribe";
import { startOfTodayUTC } from "./lib/timeOfDay";

// Plus dictation (#557). A take is capped at 3 minutes on the client and
// recorded as mono 32kbps AAC (≈4KB/s → ~720KB); this leaves room for container
// overhead while staying under Convex's 1MB v.bytes() ceiling.
export const MAX_DICTATION_BYTES = 900_000;
// Mono 32kbps AAC ≈ 4KB/s. Floors the charge so a client can't under-report.
const AUDIO_BYTES_PER_SECOND = 4000;
const DEFAULT_DAILY_CAP_MINUTES = 30;

function dailyCapSeconds(): number {
  const raw = Number(process.env.DICTATION_DAILY_CAP_MINUTES_PLUS ?? DEFAULT_DAILY_CAP_MINUTES);
  const minutes = Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_DAILY_CAP_MINUTES;
  return minutes * 60;
}

/** Seconds dictated today, with the same lazy daily reset as vent's counter. */
function secondsUsedToday(profile: Doc<"emotional_profiles">): number {
  const fresh = (profile.dictationDailyResetAt ?? 0) >= startOfTodayUTC();
  return fresh ? (profile.dictationDailySecondsUsed ?? 0) : 0;
}

const capReached = (profile: Doc<"emotional_profiles">) =>
  secondsUsedToday(profile) >= dailyCapSeconds();

/**
 * The UTC day (its midnight) on which the Plus dictation budget was spent, or
 * null. The client falls back to on-device while it is today's. Reads no
 * clock: Convex caches a query until its data changes, so a Date-based
 * answer would stay "capped" past midnight.
 */
export const status = query({
  args: {},
  returns: v.object({ cappedOn: v.union(v.number(), v.null()) }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const used = profile.dictationDailySecondsUsed ?? 0;
    const cappedOn =
      used >= dailyCapSeconds() ? (profile.dictationDailyResetAt ?? null) : null;
    return { cappedOn };
  },
});

/**
 * Auth, Plus and today's cap for the action, which can't read the db itself.
 * A mutation, not a query, so the clock-dependent cap is never served cached.
 */
export const callerStatus = internalMutation({
  args: {},
  returns: v.object({ isPlus: v.boolean(), capReached: v.boolean() }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    return { isPlus: await hasPremium(ctx, profile), capReached: capReached(profile) };
  },
});

export const charge = internalMutation({
  args: { seconds: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    await ctx.db.patch("emotional_profiles", profile._id, {
      dictationDailySecondsUsed: secondsUsedToday(profile) + args.seconds,
      dictationDailyResetAt: startOfTodayUTC(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Transcribe one Plus dictation take with Scribe (language auto-detected).
 * The audio is never stored or logged — it goes straight to Scribe and is
 * dropped. Returns null when transcription fails, "" when nothing was heard.
 * A transcribed take is charged to today's dictation budget by its recorded
 * duration; a failed one is not.
 *
 * @throws ConvexError `plus_required` for a non-Plus caller
 * @throws ConvexError `dictation_cap_reached` once today's budget is spent
 * @throws ConvexError `audio_too_large` for a take over the 3-minute ceiling
 */
export const transcribe = action({
  // durationMs is optional for the #557 client, which charges by payload alone.
  args: { audioBytes: v.bytes(), durationMs: v.optional(v.number()) },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args): Promise<string | null> => {
    const caller: { isPlus: boolean; capReached: boolean } = await ctx.runMutation(
      internal.dictation.callerStatus,
      {},
    );
    if (!caller.isPlus) {
      throw new ConvexError({ code: "plus_required", message: "Xolace+ required: dictation" });
    }
    if (caller.capReached) {
      throw new ConvexError({ code: "dictation_cap_reached", message: "Dictation cap reached" });
    }
    if (args.audioBytes.byteLength > MAX_DICTATION_BYTES) {
      throw new ConvexError({ code: "audio_too_large", message: "Dictation take too long" });
    }

    const apiKey = process.env.ELEVENLABS_VOICE_API_KEY;
    if (!apiKey) {
      console.error("[dictation] ELEVENLABS_VOICE_API_KEY not set");
      return null;
    }
    const text = await transcribeAudio(apiKey, args.audioBytes);
    if (text !== null) {
      // ponytail: checked before Scribe and charged after, so parallel takes can
      // overshoot the cap by one take each; a soft cap is fine for cost.
      const seconds = Math.ceil(
        Math.max((args.durationMs ?? 0) / 1000, args.audioBytes.byteLength / AUDIO_BYTES_PER_SECOND),
      );
      try {
        await ctx.runMutation(internal.dictation.charge, { seconds });
      } catch (err) {
        // The words are already paid for; losing them costs more than the charge.
        console.error("[dictation] charge failed:", err);
      }
    }
    return text;
  },
});
