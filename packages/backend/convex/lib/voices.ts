import { type Infer, v } from "convex/values";

// Single source of truth for TTS voices. Client-facing slugs only — raw
// ElevenLabs ids never leave the server. See docs/voice-naming.md for the
// campfire-naming rationale (slugs are permanent once shipped).

// Plus-only custom-voice cast. Undefined preference = default behavior
// (tone-mapped mirror voice, Witnessed vent voice). Not to be confused with
// the tone defaults below, which are never pickable.
export const VOICE_CATALOG = {
	ash: { elevenLabsId: "Bj9UqZbhQsanLzgalpEG", label: "Ash" }, // Austin — deep, raspy, fireside
	sage: { elevenLabsId: "RILOU7YmBhvwJGDGjNmP", label: "Sage" }, // Jane — older, warm storyteller
	vesper: { elevenLabsId: "BIvP0GN1cAtSRTxNHnWS", label: "Vesper" }, // Ellen — calm, grounded
	wren: { elevenLabsId: "exsUS4vynmxd379XN4yO", label: "Wren" }, // Blondie — warm British
} as const;

export type VoiceSlug = keyof typeof VOICE_CATALOG;

export const voiceSlugValidator = v.union(
	v.literal("sage"),
	v.literal("wren"),
	v.literal("vesper"),
	v.literal("ash")
);

// Tone-mapped mirror voices (free default path). Moved here from ai/tts.ts so
// every voice id lives in one file.
export const TONE_DEFAULT_VOICE: Record<string, string> = {
	adaptive: "c6SfcYrb2t09NHXiT80T", // Jarnathan — versatile, wide emotional range
	direct: "EkK5I93UQWFDigLMpZcX", // James — modulated, controlled, direct
	gentle: "BpjGufoPiobT79j2vtj4", // Priyanka — calm, soothing, late-night warmth
	poetic: "Z3R5wn05IrDiVCyEkUrK", // Arabella — mysterious, emotive
	witnessed: "NOpBlnGInO9m6vDvFkFC", // Spuds Oxley — wise, approachable
};

// Default vent voice when the user has no (or no longer entitled to a) custom
// voice. Same as the Witnessed tone voice — moved here from vent.ts.
export const VENT_DEFAULT_VOICE_ID = TONE_DEFAULT_VOICE.witnessed;

/**
 * Resolve a client slug to an ElevenLabs voice id, falling back to `fallback`
 * when the slug is absent or unknown. The generation-time premium re-check
 * happens at the call sites, not here.
 */
export function resolveVoiceId(
	slug: string | undefined,
	fallback: string
): string {
	return (slug && VOICE_CATALOG[slug as VoiceSlug]?.elevenLabsId) || fallback;
}

// The companion in a talk (#603, decided in #583): its own voice from the
// cast, the person's mirror/vent voice when unset, else Vesper. Pace is the
// agent's `speed` override; directness a line in our prompt. All three are
// fixed for the length of a talk.
export const TALK_FALLBACK_VOICE: VoiceSlug = "vesper";

export const talkPaceValidator = v.union(
	v.literal("slower"),
	v.literal("normal")
);
export type TalkPace = Infer<typeof talkPaceValidator>;
export const TALK_SPEED: Record<TalkPace, number> = {
	normal: 1.0,
	slower: 0.85,
};

// Unset sits between the two: no prompt line.
export const talkDirectnessValidator = v.union(
	v.literal("gentle"),
	v.literal("straight")
);
export type TalkDirectness = Infer<typeof talkDirectnessValidator>;
