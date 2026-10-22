// Words stream into the thread as they are spoken (#593). ElevenLabs sends
// each audio chunk with per-character timings; this turns one chunk into
// word reveals on the clock, starting at `base` (when the chunk starts playing).

/** The shape of `onAudioAlignment`'s argument. */
export type Alignment = { chars: string[]; char_start_times_ms: number[]; char_durations_ms: number[] };
export type SpokenWord = { text: string; at: number };

export function spokenWords(a: Alignment, base: number): { words: SpokenWord[]; end: number } {
  const words: SpokenWord[] = [];
  a.chars.forEach((ch, i) => {
    // A word starts at a letter after a space; spaces ride with the word before.
    const startsWord = i === 0 || (ch.trim() !== "" && a.chars[i - 1].trim() === "");
    if (startsWord) words.push({ text: ch, at: base + a.char_start_times_ms[i] });
    else words[words.length - 1].text += ch;
  });
  const last = a.chars.length - 1;
  const end = last < 0 ? base : base + a.char_start_times_ms[last] + a.char_durations_ms[last];
  return { words, end };
}
