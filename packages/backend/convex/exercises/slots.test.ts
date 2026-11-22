import { describe, expect, it } from "vitest";
import { PRIMARY_EMOTIONS } from "../lib/understandingVocab";
import {
	emotionAdjective,
	firstSentence,
	saidByUser,
	slotKeysToFill,
	tidyPhrase,
	typeset,
} from "./slots";

describe("emotionAdjective", () => {
	it("turns the classifier's noun into a word that fits “Something in you is ___.”", () => {
		expect(emotionAdjective("anger")).toBe("angry");
		expect(emotionAdjective(" Frustration ")).toBe("frustrated");
		expect(emotionAdjective("self-doubt")).toBe("doubting itself");
	});

	it("leaves an emotion with no adjective unfilled, so the default copy plays", () => {
		expect(emotionAdjective("love")).toBeUndefined();
		expect(emotionAdjective("not-belonging")).toBeUndefined();
		expect(emotionAdjective("wistfulness")).toBeUndefined();
		expect(emotionAdjective("constructor")).toBeUndefined();
	});

	it("covers every emotion it is taught, and nothing outside the vocabulary", () => {
		const taught = PRIMARY_EMOTIONS.filter((e) => emotionAdjective(e));
		expect(taught.length).toBe(PRIMARY_EMOTIONS.length - 2);
	});
});

describe("firstSentence", () => {
	it("keeps the mirror's first sentence", () => {
		expect(
			firstSentence(
				"It sounds like the meeting is still playing on a loop.  You keep going back to it."
			)
		).toBe("It sounds like the meeting is still playing on a loop.");
	});

	it("keeps a closing quote and splits only before a new sentence", () => {
		expect(firstSentence("You called it “too much.” That makes sense.")).toBe(
			"You called it “too much.”"
		);
		expect(
			firstSentence("You're at 3.5 hours of sleep... and still going")
		).toBe("You're at 3.5 hours of sleep... and still going");
	});

	it("collapses whitespace and is empty for an empty mirror", () => {
		expect(firstSentence("  one\nline  ")).toBe("one line");
		expect(firstSentence("   ")).toBe("");
	});
});

describe("typeset and tidyPhrase", () => {
	it("curls apostrophes and double quotes", () => {
		expect(typeset(`You don't have to call it "fine".`)).toBe(
			"You don’t have to call it “fine”."
		);
	});

	it("puts “I” back upright in a lowercased phrase", () => {
		expect(tidyPhrase("i can't keep up")).toBe("I can’t keep up");
		expect(tidyPhrase("like i'm failing")).toBe("like I’m failing");
		expect(tidyPhrase("it is hitting me")).toBe("it is hitting me");
		expect(tidyPhrase("one step behind")).toBe("one step behind");
	});
});

describe("slotKeysToFill", () => {
	const steps = [
		{ slotKeys: ["mirror_line"] },
		{},
		{ slotKeys: ["user_emotion", "mirror_line"] },
	];

	it("asks for each slot once", () => {
		expect(slotKeysToFill(steps, { fallbackMirror: false })).toEqual([
			"mirror_line",
			"user_emotion",
		]);
	});

	it("leaves the mirror line to its default when the mirror fell back", () => {
		expect(slotKeysToFill(steps, { fallbackMirror: true })).toEqual([
			"user_emotion",
		]);
	});
});

describe("saidByUser", () => {
	const wrote =
		"Honestly? I’m so TIRED of feeling one step behind, at work and at home.";

	it("finds a phrase they wrote, whatever its case and punctuation", () => {
		expect(saidByUser("one step behind", wrote)).toBe(true);
		expect(saidByUser("i'm so tired", wrote)).toBe(true);
		expect(saidByUser("Im so tired of feeling", wrote)).toBe(true);
	});

	it("refuses a phrase only the mirror used", () => {
		const mirror = "It sounds like you’re carrying a lot right now.";
		expect(saidByUser("carrying a lot", mirror)).toBe(true);
		expect(saidByUser("carrying a lot", wrote)).toBe(false);
	});

	it("refuses their words out of order, or cut mid-word", () => {
		expect(saidByUser("behind one step", wrote)).toBe(false);
		expect(saidByUser("tired at home", wrote)).toBe(false);
		expect(saidByUser("ep behind", wrote)).toBe(false);
		expect(saidByUser("", wrote)).toBe(false);
	});
});
