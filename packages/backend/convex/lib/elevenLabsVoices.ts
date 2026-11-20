import { isVoiceSlug, type VoiceSlug } from "./shared";

// Plus-only custom-voice cast. Undefined preference = default behavior
// (tone-mapped mirror voice, Witnessed vent voice). Not to be confused with
// the tone defaults below, which are never pickable.
export const VOICE_CATALOG = {
	ash: { elevenLabsId: "Bj9UqZbhQsanLzgalpEG", label: "Ash" }, // Austin — deep, raspy, fireside
	sage: { elevenLabsId: "RILOU7YmBhvwJGDGjNmP", label: "Sage" }, // Jane — older, warm storyteller
	vesper: { elevenLabsId: "BIvP0GN1cAtSRTxNHnWS", label: "Vesper" }, // Ellen — calm, grounded
	wren: { elevenLabsId: "exsUS4vynmxd379XN4yO", label: "Wren" }, // Blondie — warm British
} as const satisfies Record<VoiceSlug, { elevenLabsId: string; label: string }>;

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
	return isVoiceSlug(slug) ? VOICE_CATALOG[slug].elevenLabsId : fallback;
}
