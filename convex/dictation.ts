import { ConvexError, v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { transcribeAudio } from "./ai/transcribe";

// Plus dictation (#557). A take is capped at 3 minutes on the client and
// recorded as mono 32kbps AAC (≈4KB/s → ~720KB); this leaves room for container
// overhead while staying under Convex's 1MB v.bytes() ceiling.
export const MAX_DICTATION_BYTES = 900_000;

/** Auth + Plus for the action, which can't read the db itself. */
export const callerIsPlus = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx): Promise<boolean> => {
    const { profile } = await requireAuth(ctx);
    return await hasPremium(ctx, profile);
  },
});

/**
 * Transcribe one Plus dictation take with Scribe (language auto-detected).
 * The audio is never stored or logged — it goes straight to Scribe and is
 * dropped. Returns null when transcription fails, "" when nothing was heard.
 *
 * @throws ConvexError `plus_required` for a non-Plus caller
 * @throws ConvexError `audio_too_large` for a take over the 3-minute ceiling
 */
export const transcribe = action({
  args: { audioBytes: v.bytes() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args): Promise<string | null> => {
    const isPlus: boolean = await ctx.runQuery(internal.dictation.callerIsPlus, {});
    if (!isPlus) {
      throw new ConvexError({ code: "plus_required", message: "Xolace+ required: dictation" });
    }
    if (args.audioBytes.byteLength > MAX_DICTATION_BYTES) {
      throw new ConvexError({ code: "audio_too_large", message: "Dictation take too long" });
    }

    const apiKey = process.env.ELEVENLABS_VOICE_API_KEY;
    if (!apiKey) {
      console.error("[dictation] ELEVENLABS_VOICE_API_KEY not set");
      return null;
    }
    return await transcribeAudio(apiKey, args.audioBytes);
  },
});
