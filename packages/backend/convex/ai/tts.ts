import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  TONE_DEFAULT_VOICE,
  resolveVoiceId,
  voiceSlugValidator,
  type VoiceSlug,
} from "../lib/voices";
import type { MirrorTone } from "./mirrorPlan";

/**
 * Owns the mirror-audio TTS lifecycle for both the initial mirror (process.ts)
 * and refinement turns (clarify.ts). Applies the generation-time premium voice
 * fence once (the mutation gate alone wouldn't cover a subscription that lapsed
 * after the voice was chosen), skips the fallback mirror (nothing to speak),
 * and — for clarify — deletes the stale audio before scheduling the fresh one.
 */
export async function scheduleMirrorAudio(
  ctx: ActionCtx,
  args: {
    sessionId: Id<"sessions">;
    ttsText: string;
    isFallback: boolean;
    tone: MirrorTone;
    isPremium: boolean;
    voice: string | undefined;
    /** clarify: replace the prior turn's audio before generating anew. */
    replaceExisting?: boolean;
  },
): Promise<void> {
  if (args.replaceExisting) {
    const oldStorageId = await ctx.runQuery(
      internal.sessions.getMirrorAudioStorageId,
      { sessionId: args.sessionId },
    );
    if (oldStorageId) {
      await ctx.storage.delete(oldStorageId);
      await ctx.runMutation(internal.sessions.clearMirrorAudio, {
        sessionId: args.sessionId,
      });
    }
  }

  if (args.isFallback) return;

  await ctx.scheduler.runAfter(0, internal.ai.tts.generateMirrorAudio, {
    sessionId: args.sessionId,
    mirrorText: args.ttsText,
    mirrorTone: args.tone,
    voiceSlug: args.isPremium
      ? (args.voice as VoiceSlug | undefined)
      : undefined,
  });
}

/**
 * Generates ElevenLabs TTS for a mirror text and stores the audio in Convex
 * file storage. Idempotent — skips generation if audio already exists.
 * Scheduled fire-and-forget after mirror delivery in process.ts.
 */
export const generateMirrorAudio = internalAction({
  args: {
    sessionId: v.id("sessions"),
    mirrorText: v.string(),
    mirrorTone: v.union(
      v.literal("poetic"),
      v.literal("gentle"),
      v.literal("direct"),
      v.literal("adaptive"),
      v.literal("witnessed"),
    ),
    // Plus custom-voice override. Resolved to an ElevenLabs id below; when
    // absent, falls back to the tone-mapped voice. Premium is re-checked at
    // the scheduling call site, not here.
    voiceSlug: v.optional(voiceSlugValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Idempotency: bail if audio was already generated (e.g. duplicate schedule)
    const existingStorageId = await ctx.runQuery(
      internal.sessions.getMirrorAudioStorageId,
      { sessionId: args.sessionId },
    );
    if (existingStorageId) return;

    const apiKey = process.env.ELEVENLABS_VOICE_API_KEY;
    if (!apiKey) {
      console.error("[tts] ELEVENLABS_VOICE_API_KEY not set — skipping TTS");
      return;
    }

    const voiceId = resolveVoiceId(
      args.voiceSlug,
      TONE_DEFAULT_VOICE[args.mirrorTone] ?? TONE_DEFAULT_VOICE.adaptive,
    );
    console.log("[tts] voice:", args.voiceSlug ?? `tone:${args.mirrorTone}`, "->", voiceId);
    console.log("mirror ", args.mirrorText)

    let audioBuffer: ArrayBuffer;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: args.mirrorText,
            model_id: "eleven_v3",
            voice_settings: {
              stability: 0.3,
              use_speaker_boost: true,
            },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.text();
        console.error(`[tts] ElevenLabs error ${response.status}: ${body}`);
        return;
      }

      audioBuffer = await response.arrayBuffer();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error("[tts] ElevenLabs request timed out after 30s");
      } else {
        console.error("[tts] Fetch failed:", err);
      }
      return;
    } finally {
      clearTimeout(timeout);
    }

    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
    const storageId = await ctx.storage.store(blob);

    await ctx.runMutation(internal.sessions.storeMirrorAudio, {
      sessionId: args.sessionId,
      storageId,
    });

    console.log(`[tts] Audio stored for session ${args.sessionId}`);
  },
});
