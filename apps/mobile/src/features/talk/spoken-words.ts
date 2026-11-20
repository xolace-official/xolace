export type Alignment = {
	chars: string[];
	char_start_times_ms: number[];
	char_durations_ms: number[];
};
export type SpokenWord = { text: string; at: number };
export type TagState = { inTag: boolean; space: boolean };

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
