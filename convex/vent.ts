import { v } from "convex/values";
import { internalMutation, action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { recordActivity } from "./streaks/activityLog";
import { writeVentAcknowledgement } from "./ai/ventAcknowledge";
import { renderSemanticProfile } from "./semanticProfiles";
import {
  moderateInput,
  MODERATION_UNAVAILABLE,
} from "./ai/providers/moderation";
import { resolveVoiceId, VENT_DEFAULT_VOICE_ID } from "./lib/voices";

const CRISIS_FALLBACK = "you don't have to carry this alone";

// Ceiling on what a single vent can charge — also the fallback when the
// caller can't know the real duration (e.g. the legacy agent session token).
// Tiered so a longer Plus recording isn't clipped when charged against the cap.
const MAX_INCREMENT_MINUTES_FREE = 3;
const MAX_INCREMENT_MINUTES_PLUS = 5;

function getMaxIncrementMinutes(premium: boolean): number {
  return premium ? MAX_INCREMENT_MINUTES_PLUS : MAX_INCREMENT_MINUTES_FREE;
}
// Mono 48kbps AAC ≈ 6KB/s. Used to sanity-check the client-claimed duration
// against the actual payload so a tampered client can't under-report.
const AUDIO_BYTES_PER_SECOND = 6000;

// How long a vent's TTS blob lives before it's reclaimed. Playback needs
// seconds; an hour absorbs a backgrounded app returning to the coda. After
// this the URL 404s, which is fine — the words are already on screen.
const VENT_AUDIO_TTL_MS = 60 * 60 * 1000;

function startOfTodayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Gate voice vent sessions behind a daily usage cap.
 *
 * Lazy daily reset: if ventDailyResetAt < startOfTodayUTC, the counter is
 * treated as 0 for today. The cap is read from ELEVENLABS_DAILY_CAP_MINUTES_FREE
 * / ELEVENLABS_DAILY_CAP_MINUTES_PLUS (default 2 / 8) depending on tier.
 * Increments by the actual session length in whole minutes (clamped to
 * 1..getMaxIncrementMinutes(tier)) — callers derive it from the recording
 * duration and payload size.
 *
 * Returns { allowed: false } without incrementing when cap is exceeded.
 */
export const checkAndIncrementCap = internalMutation({
  args: { minutes: v.number() },
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const premium = await hasPremium(ctx, profile);

    const minutes = Math.min(
      Math.max(Math.ceil(args.minutes), 1),
      getMaxIncrementMinutes(premium),
    );

    const todayStart = startOfTodayUTC();
    const capRaw = Number(
      process.env[
        premium
          ? "ELEVENLABS_DAILY_CAP_MINUTES_PLUS"
          : "ELEVENLABS_DAILY_CAP_MINUTES_FREE"
      ] ?? (premium ? "8" : "2"),
    );
    const cap =
      Number.isFinite(capRaw) && capRaw >= 0
        ? Math.floor(capRaw)
        : premium
          ? 8
          : 2;

    const needsReset =
      !profile.ventDailyResetAt || profile.ventDailyResetAt < todayStart;

    const currentUsed = needsReset ? 0 : (profile.ventDailyMinutesUsed ?? 0);

    if (currentUsed >= cap) {
      return { allowed: false as const };
    }

    await ctx.db.patch("emotional_profiles", profile._id, {
      ventDailyMinutesUsed: currentUsed + minutes,
      ventDailyResetAt: needsReset ? todayStart : profile.ventDailyResetAt,
      updatedAt: Date.now(),
    });
    // The charge is the vent's only server-side write — the burn itself is
    // client-only — so a charged vent is the completed one.
    await recordActivity(ctx, { emotionalProfileId: profile._id, actionType: "vent" });

    return { allowed: true as const, emotionalProfileId: profile._id };
  },
});

/**
 * Reclaim a vent's TTS blob after its short playback life (see
 * VENT_AUDIO_TTL_MS). Scheduled from runVentPipeline; no-op-safe if the file
 * is already gone.
 */
export const deleteVentAudio = internalMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return null;
  },
});

// Crisis keywords for the vent pipeline's server-side pre-filter. A hit is
// confirmed via moderation before it changes behavior (see runVentPipeline).
const CRISIS_KEYWORDS = [
  "kill myself",
  "hurt myself",
  "end it",
  "end my life",
  "don't want to be here",
  "want to die",
  "suicidal",
  "suicide",
];

// Moderation may only DE-escalate a keyword hit, never escalate — so the
// threshold is lenient toward crisis. A false positive costs the user a
// static fallback line; a false negative riffs warmly over suicidal content.
const CRISIS_CLEAR_THRESHOLD = 0.35;
const SELF_HARM_CATEGORIES = [
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
] as const;

/**
 * Confirm a keyword-flagged transcript via OpenAI moderation.
 * Returns false (not crisis) only when every self-harm score is clearly low —
 * the idiom case ("end it... this sprint"). Fails safe: if moderation is
 * unavailable, the keyword hit stands and we stay in crisis mode.
 */
async function confirmCrisisWithModeration(
  transcript: string,
): Promise<boolean> {
  const moderation = await moderateInput(transcript);
  if (moderation === MODERATION_UNAVAILABLE) {
    console.warn("[vent] Moderation unavailable — keeping crisis flag (fail safe)");
    return true;
  }
  return SELF_HARM_CATEGORIES.some(
    (cat) => (moderation.categoryScores[cat] ?? 0) >= CRISIS_CLEAR_THRESHOLD,
  );
}

// ---------------------------------------------------------------------------
// Vent pipeline — Approach B (expo-audio + Scribe STT + Claude + ElevenLabs)
// ---------------------------------------------------------------------------

type VentResult = {
  words: string | null;
  audioUrl: string | null;
  isCrisis: boolean;
  // True only when the daily cap blocked the pipeline — lets the client
  // distinguish "limit reached" from a genuine (silent) pipeline failure.
  capReached: boolean;
};

/**
 * Core pipeline: Scribe v2 STT → safety check → Claude acknowledgement → TTS.
 * Transcript is NEVER stored at any point.
 * All failures are soft — returns null words/audioUrl so the client can still
 * play the destruction animation regardless.
 */
async function transcribeVentAudio(
  apiKey: string,
  audioBytes: ArrayBuffer,
): Promise<string | null> {
  const scribeController = new AbortController();
  const scribeTimeout = setTimeout(() => scribeController.abort(), 30_000);
  try {
    const blob = new Blob([audioBytes], { type: "audio/m4a" });
    const formData = new FormData();
    formData.append("file", blob, "recording.m4a");
    formData.append("model_id", "scribe_v2");

    const scribeRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData,
      signal: scribeController.signal,
    });

    if (!scribeRes.ok) {
      const body = await scribeRes.text();
      console.error(`[vent] Scribe error ${scribeRes.status}: ${body}`);
      return null;
    }

    const data = await scribeRes.json();
    return typeof data.text === "string" ? data.text.trim() : "";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[vent] Scribe request timed out");
    } else {
      console.error("[vent] Scribe fetch failed:", err);
    }
    return null;
  } finally {
    clearTimeout(scribeTimeout);
  }
}

async function runVentPipeline(
  ctx: ActionCtx,
  audioBytes: ArrayBuffer,
  emotionalProfileId?: Id<"emotional_profiles">,
): Promise<VentResult> {
  const apiKey = process.env.ELEVENLABS_VOICE_API_KEY;
  if (!apiKey) {
    console.error("[vent] ELEVENLABS_VOICE_API_KEY not set — skipping pipeline");
    return { words: null, audioUrl: null, isCrisis: false, capReached: false };
  }

  // --- Step 1: Scribe v2 STT, run alongside the (read-only) semantic profile
  // and resolved-voice fetches — both depend only on emotionalProfileId, not
  // the transcript, so their cost is fully hidden behind the STT round-trip.
  const [transcriptResult, semanticProfileDoc, voiceSlug] = await Promise.all([
    transcribeVentAudio(apiKey, audioBytes),
    emotionalProfileId
      ? ctx.runQuery(internal.semanticProfiles.getCurrent, { emotionalProfileId })
      : Promise.resolve(null),
    emotionalProfileId
      ? ctx.runQuery(internal.preferences.getResolvedVoiceSlug, { emotionalProfileId })
      : Promise.resolve(null),
  ]);

  if (transcriptResult === null) {
    return { words: null, audioUrl: null, isCrisis: false, capReached: false };
  }
  const transcript = transcriptResult;

  if (transcript.length < 20) {
    console.log("[vent] Transcript too short — skipping acknowledgement");
    return { words: null, audioUrl: null, isCrisis: false, capReached: false };
  }

  console.log("[vent] Transcript length:", transcript.length, "(not stored)");

  const semanticProfile = semanticProfileDoc
    ? renderSemanticProfile(semanticProfileDoc)
    : null;

  // --- Step 2: Crisis check (keyword pre-filter → moderation confirm) ---
  const lower = transcript.toLowerCase();
  let isCrisis = false;
  if (CRISIS_KEYWORDS.some((kw) => lower.includes(kw))) {
    isCrisis = await confirmCrisisWithModeration(transcript);
    if (isCrisis) {
      console.warn("[vent] Crisis confirmed — returning static fallback");
    } else {
      console.log("[vent] Crisis keyword cleared by moderation (idiom)");
    }
  }

  // --- Step 3: Generate acknowledgement words ---
  let words: string | null = null;
  if (isCrisis) {
    words = CRISIS_FALLBACK;
  } else {
    try {
      words =
        (await writeVentAcknowledgement(transcript, semanticProfile)).trim() ||
        null;
      console.log("[vent] Acknowledgement:", words);
    } catch (err) {
      console.error("[vent] Claude acknowledgement failed:", err);
    }
  }

  if (!words) return { words: null, audioUrl: null, isCrisis, capReached: false };

  // --- Step 4: ElevenLabs TTS ---
  let audioUrl: string | null = null;
  const ttsController = new AbortController();
  const ttsTimeout = setTimeout(() => ttsController.abort(), 30_000);
  try {
    const ventVoiceId = resolveVoiceId(voiceSlug ?? undefined, VENT_DEFAULT_VOICE_ID);
    console.log("[vent] voice:", voiceSlug ?? "default", "->", ventVoiceId);
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ventVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: words,
          model_id: "eleven_v3",
          voice_settings: { stability: 0.4, use_speaker_boost: true },
        }),
        signal: ttsController.signal,
      },
    );

    if (!ttsRes.ok) {
      const body = await ttsRes.text();
      console.error(`[vent] TTS error ${ttsRes.status}: ${body}`);
    } else {
      const audioBuffer = await ttsRes.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const storageId = await ctx.storage.store(audioBlob);
      audioUrl = await ctx.storage.getUrl(storageId);
      // The client plays this once, right after the burn animation, then pops
      // the route — the blob is never replayed or persisted. Nothing keeps its
      // id anywhere, so schedule its own deletion or it orphans in storage
      // forever. The TTL covers a user who backgrounds mid-coda and returns.
      await ctx.scheduler.runAfter(VENT_AUDIO_TTL_MS, internal.vent.deleteVentAudio, {
        storageId,
      });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[vent] TTS request timed out");
    } else {
      console.error("[vent] TTS fetch failed:", err);
    }
  } finally {
    clearTimeout(ttsTimeout);
  }

  return { words, audioUrl, isCrisis, capReached: false };
}

/**
 * Internal action — full vent pipeline without auth/cap checks.
 * Useful for server-side testing. Transcript is never stored.
 */
export const transcribeAndAcknowledge = internalAction({
  args: { audioBytes: v.bytes() },
  handler: async (ctx, args) => {
    return runVentPipeline(ctx, args.audioBytes);
  },
});

/**
 * Public action — auth + daily cap gate, then runs the full vent pipeline.
 * Client converts the recorded audio URI to ArrayBuffer and passes it here.
 *
 * Returns { words, audioUrl, isCrisis }. All values are nullable on failure.
 * The client plays the destruction animation regardless of what comes back.
 */
export const processVentAudio = action({
  args: { audioBytes: v.bytes(), durationMs: v.number() },
  handler: async (ctx, args): Promise<VentResult> => {
    // Fast-fail only — full requireAuth (user, accountStatus, profile) runs
    // inside checkAndIncrementCap below, transactionally with the cap charge.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Charge actual usage: trust whichever is larger of the client-claimed
    // duration and what the payload size implies, so under-reporting is moot.
    const claimedSeconds = Math.max(args.durationMs, 0) / 1000;
    const payloadSeconds = args.audioBytes.byteLength / AUDIO_BYTES_PER_SECOND;
    const minutes = Math.max(claimedSeconds, payloadSeconds) / 60;

    const capResult: (
      | { allowed: true; emotionalProfileId: Id<"emotional_profiles"> }
      | { allowed: false }
    ) = await ctx.runMutation(internal.vent.checkAndIncrementCap, { minutes });
    if (!capResult.allowed) {
      console.log("[vent] Daily cap reached — skipping pipeline");
      return { words: null, audioUrl: null, isCrisis: false, capReached: true };
    }

    return runVentPipeline(ctx, args.audioBytes, capResult.emotionalProfileId);
  },
});
