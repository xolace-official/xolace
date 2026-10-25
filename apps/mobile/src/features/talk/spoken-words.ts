// Words stream into the thread as they are spoken (#593). ElevenLabs sends
// each audio chunk with per-character timings; this turns one chunk into
// word reveals on the clock, starting at `base` (when the chunk starts playing).

/** The shape of `onAudioAlignment`'s argument. */
export type Alignment = {
	chars: string[];
	char_start_times_ms: number[];
	char_durations_ms: number[];
};
export type SpokenWord = { text: string; at: number };
/** Carried across a turn's chunks: a tag can be split between two. */
export type TagState = { inTag: boolean; space: boolean };

/**
 * The chunk without its audio tags (#603). The voice performs "[slow]" and
 * the rest, and their characters come back in the timings like any other, so
 * they'd be read out on screen. Everything in brackets goes (the endpoint lets
 * only the five tags through), and so does the space a tag leaves doubled.
 * `state` is updated in place; start each turn at `{ inTag: false, space: true }`.
 */
export function withoutTags(a: Alignment, state: TagState): Alignment {
	const out: Alignment = {
		char_durations_ms: [],
		char_start_times_ms: [],
		chars: [],
	};
	a.chars.forEach((ch, i) => {
		if (ch === "[") {
			state.inTag = true;
		} else if (state.inTag) {
			state.inTag = ch !== "]";
		} else {
			const space = ch.trim() === "";
			if (!(space && state.space)) {
				state.space = space;
				out.chars.push(ch);
				out.char_start_times_ms.push(a.char_start_times_ms[i]);
				out.char_durations_ms.push(a.char_durations_ms[i]);
			}
		}
	});
	return out;
}

export function spokenWords(
	a: Alignment,
	base: number
): { words: SpokenWord[]; end: number } {
	const words: SpokenWord[] = [];
	a.chars.forEach((ch, i) => {
		// A word starts at a letter after a space; spaces ride with the word before.
		const startsWord =
			i === 0 || (ch.trim() !== "" && a.chars[i - 1].trim() === "");
		if (startsWord) {
			words.push({ at: base + a.char_start_times_ms[i], text: ch });
		} else {
			words[words.length - 1].text += ch;
		}
	});
	const last = a.chars.length - 1;
	const end =
		last < 0
			? base
			: base + a.char_start_times_ms[last] + a.char_durations_ms[last];
	return { end, words };
}
