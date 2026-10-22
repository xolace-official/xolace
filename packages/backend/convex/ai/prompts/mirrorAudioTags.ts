/**
 * Xolace+ perk: instructs the articulator to bake ElevenLabs v3 audio tags
 * directly into the mirror it writes (single-pass, same call — no extra
 * model round-trip). Applies across all mirror tones, gated on isPremium
 * only. The tagged text is used for TTS; a tag-stripped copy is what gets
 * stored/displayed (see stripAudioTags / applyAudioFence below).
 *
 * Adapted from ElevenLabs' own dialogue-tagging prompt to a single-line
 * mirror instead of multi-speaker dialogue.
 */
export const AUDIO_TAG_INSTRUCTIONS = `
## Audio Expressiveness (Xolace+)
After writing the mirror, enhance it with audio tags so it sounds more human when read aloud by a voice model.

DO:
- Integrate audio tags (e.g. [sighs], [thoughtful]) that describe something auditory for the voice only
- Place tags immediately before or after the segment they modify
- Aim for 1-3 tags total, chosen to match the emotional weight of what you wrote
- Add emphasis only through capitalization, a question mark, an exclamation mark, or ellipses where it makes sense

DO NOT:
- Alter, add, or remove any words from the mirror text — tags and emphasis are additions only, never edits
- Use tags for anything other than the voice (no [standing], [grinning], [music])
- Let the tags change or contradict the meaning of the mirror

Audio tags (non-exhaustive): [happy] [sad] [thoughtful] [whisper] [gentle] [warm] [soft] [sighs] [exhales sharply] [inhales deeply] [short pause] [long pause] [chuckles] [clears throat]

Enclose every tag in square brackets. Reply with ONLY the enhanced mirror text — still following every rule above, no labels, no explanation.
`;

/**
 * Strips ElevenLabs audio tags (e.g. "[sighs]") from a tagged mirror so the
 * stored/displayed text (recentMirrors, timeline, pattern context) never
 * carries them — only the TTS request sees the raw tagged version.
 */
export function stripAudioTags(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The Xolace+ audio-tag fence, owned in one place. Audio tags (when present)
 * live only in the TTS input; the stored/displayed text always reads the
 * stripped copy so a tag never leaks into anything but speech. Fallback
 * mirrors are never tagged, so they pass through untouched. Callers keep
 * their own FALLBACK_MIRROR string local and pass the boolean.
 */
export function applyAudioFence(input: {
  mirrorText: string;
  isFallback: boolean;
  isPremium: boolean;
}): { displayText: string; ttsText: string } {
  return {
    ttsText: input.mirrorText,
    displayText:
      input.isPremium && !input.isFallback
        ? stripAudioTags(input.mirrorText)
        : input.mirrorText,
  };
}
