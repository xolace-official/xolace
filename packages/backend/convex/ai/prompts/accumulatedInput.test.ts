import { describe, expect, it } from "vitest";
import {
	buildAccumulatedInput,
	entryForAi,
	ownWords,
} from "./accumulatedInput";

describe("buildAccumulatedInput", () => {
	it("returns the raw input unchanged when no turn added text", () => {
		expect(
			buildAccumulatedInput("i feel off", [
				{ turnNumber: 1, userFeedback: "not_quite" },
				{ turnNumber: 2, userFeedback: "not_quite", userInput: "   " },
			])
		).toBe("i feel off");
	});

	it("marks each turn's text and keeps them in turn order", () => {
		const out = buildAccumulatedInput("i feel off", [
			{ turnNumber: 2, userFeedback: "say_more", userInput: "it's my brother" },
			{ turnNumber: 1, userFeedback: "not_quite", userInput: "not angry" },
		]);

		expect(out).toBe(
			'[Original]\ni feel off\n\n[After "not quite" — free text]\nnot angry\n\n[After "say more" — free text]\nit\'s my brother'
		);
	});
});

describe("entryForAi (B10)", () => {
	const WORDS = ["heavy", "restless"];

	it("is their text, untouched, when no words were picked", () => {
		expect(
			entryForAi({ entryType: "open_prompt", rawInput: "i feel off" })
		).toBe("i feel off");
		expect(
			entryForAi({
				entryType: "open_prompt",
				rawInput: "i feel off",
				textures: [],
			})
		).toBe("i feel off");
		// An older words-only build stored the joined words and sent no textures.
		expect(
			entryForAi({ entryType: "word_cloud", rawInput: "heavy, restless" })
		).toBe("heavy, restless");
	});

	it("labels a words-only entry as picked, never as written", () => {
		const out = entryForAi({
			entryType: "word_cloud",
			rawInput: "heavy, restless",
			textures: WORDS,
		});
		expect(out).toBe(
			"They wrote nothing; they only picked feeling words.\nFeeling words they picked: heavy, restless"
		);
		expect(out).not.toContain("What they wrote");
	});

	it("labels writing and picked words apart when both were given", () => {
		expect(
			entryForAi({
				entryType: "guided_entry",
				rawInput: "  work again, all week  ",
				textures: WORDS,
			})
		).toBe(
			"What they wrote:\nwork again, all week\n\nFeeling words they picked: heavy, restless"
		);
	});

	it("says what they said for a voice entry", () => {
		expect(
			entryForAi({ entryType: "voice", rawInput: "so tired", textures: WORDS })
		).toMatch(/^What they said:\nso tired\n\nFeeling words they picked/);
	});

	it("treats blank writing beside picked words as words only", () => {
		expect(
			entryForAi({
				entryType: "guided_entry",
				rawInput: "   ",
				textures: WORDS,
			})
		).toMatch(/^They wrote nothing; they only picked feeling words\./);
	});

	it("feeds the refinement base, so later turns keep the labels", () => {
		const base = entryForAi({
			entryType: "guided_entry",
			rawInput: "work again",
			textures: WORDS,
		});
		const out = buildAccumulatedInput(base, [
			{ turnNumber: 1, userFeedback: "say_more", userInput: "my manager" },
		]);
		expect(out.startsWith(`[Original]\n${base}`)).toBe(true);
		expect(out).toContain("my manager");
	});
});

describe("ownWords (B10)", () => {
	it("is what they wrote or said, and nothing for a words-only entry", () => {
		expect(ownWords({ entryType: "open_prompt", rawInput: "so tired" })).toBe(
			"so tired"
		);
		expect(ownWords({ entryType: "guided_entry", rawInput: "so tired" })).toBe(
			"so tired"
		);
		// Joined picked words, from any build, are never quotable.
		expect(
			ownWords({ entryType: "word_cloud", rawInput: "heavy, tight" })
		).toBe("");
	});
});
