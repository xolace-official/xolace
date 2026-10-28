import { describe, expect, it } from "vitest";
import { spokenWords, withoutTags } from "@/features/talk/spoken-words";

const chunk = (text: string, step = 50) => ({
	char_durations_ms: [...text].map(() => step),
	char_start_times_ms: [...text].map((_, i) => i * step),
	chars: [...text],
});

describe("spokenWords", () => {
	it("reveals each word, with its trailing space, when its first letter is spoken", () => {
		expect(spokenWords(chunk("Hi you"), 1000)).toEqual({
			end: 1300,
			words: [
				{ at: 1000, text: "Hi " },
				{ at: 1150, text: "you" },
			],
		});
	});

	it("keeps every character, so the chunks join back into the spoken line", () => {
		const { words } = spokenWords(chunk("  so, then "), 0);
		expect(words.map((w) => w.text).join("")).toBe("  so, then ");
	});

	it("returns nothing for an empty chunk and leaves the playhead where it was", () => {
		expect(spokenWords(chunk(""), 500)).toEqual({ end: 500, words: [] });
	});
});

describe("withoutTags", () => {
	const shown = (...chunks: string[]) => {
		const state = { inTag: false, space: true };
		return chunks
			.map((c) => withoutTags(chunk(c), state).chars.join(""))
			.join("");
	};

	it("drops the audio tags the voice performs, so they're never shown", () => {
		expect(shown("[slow] Take your time. [sighs] Yeah.")).toBe(
			"Take your time. Yeah."
		);
	});

	it("drops a tag split across chunks", () => {
		expect(shown("Okay. [sl", "ow] Take your time.")).toBe(
			"Okay. Take your time."
		);
	});

	it("keeps each kept character's timing", () => {
		const a = withoutTags(chunk("[laughs] Hi"), { inTag: false, space: true });
		expect(a).toEqual({
			char_durations_ms: [50, 50],
			char_start_times_ms: [450, 500],
			chars: ["H", "i"],
		});
	});
});
