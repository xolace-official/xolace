import { describe, expect, it } from "vitest";
import {
	OFFERS_USED,
	TRIAL_AND_DISCOUNT,
	TRIAL_ONLY,
} from "./dev/sample-plans";
import {
	ARRIVE_END,
	HAPPY_AT,
	keepTalkingLabel,
	litAt,
	SAID_MAX,
	saidWords,
	scrollTargetFor,
	TALK_AT,
	toggled,
} from "./first-look-model";

describe("saidWords", () => {
	it("quotes what they said, without its closing full stop", () => {
		expect(saidWords("Work won’t leave my head.")).toBe(
			"work won’t leave my head"
		);
	});

	it("keeps the capital on I, its contractions and an acronym", () => {
		expect(saidWords("I can't sleep")).toBe("I can't sleep");
		expect(saidWords("I’m so tired")).toBe("I’m so tired");
		expect(saidWords("ADHD is loud today")).toBe("ADHD is loud today");
		expect(saidWords("It won't stop")).toBe("it won't stop");
	});

	it("never cuts an emoji in half", () => {
		const said = saidWords(`a${"😭".repeat(60)}`) ?? "";
		expect(said).toBe(`a${"😭".repeat(SAID_MAX - 1)}…`);
		expect(said.isWellFormed()).toBe(true);
	});

	it("falls back to the plain line when nothing was said", () => {
		expect(saidWords("")).toBeNull();
		expect(saidWords("   \n ")).toBeNull();
		expect(saidWords("...?!")).toBeNull();
	});

	it("collapses whitespace and trims", () => {
		expect(saidWords("  tired \n\n and   wired  ")).toBe("tired and wired");
	});

	it("cuts a long answer at a word, with an ellipsis", () => {
		const long =
			"I keep going over the same conversation with my sister and I can't stop";
		const said = saidWords(long);
		expect(said).toBe("I keep going over the same conversation with my…");
		expect((said ?? "").length).toBeLessThanOrEqual(SAID_MAX + 1);
	});

	it("keeps an answer exactly at the limit whole", () => {
		const exact = "a".repeat(SAID_MAX);
		expect(saidWords(exact)).toBe(exact);
	});

	it("cuts one long word mid-word rather than showing nothing", () => {
		const said = saidWords("x".repeat(SAID_MAX + 10));
		expect(said).toBe(`${"x".repeat(SAID_MAX)}…`);
	});

	it("doesn't leave a comma before the ellipsis", () => {
		const said = saidWords(
			`${"word ".repeat(8)}endings, and then a lot more words after that`
		);
		expect(said?.endsWith(",…")).toBe(false);
	});
});

describe("the arrival", () => {
	it("lights the free row with the first Plus row, then each 110 ms apart", () => {
		expect(litAt(0)).toBe(litAt(1));
		expect(litAt(2) - litAt(1)).toBe(110);
		expect(litAt(1)).toBe(370);
	});

	it("turns Flux happy after the last check, then opens Talk, then ends", () => {
		expect(HAPPY_AT).toBeGreaterThan(litAt(4));
		expect(TALK_AT).toBeGreaterThan(HAPPY_AT);
		expect(ARRIVE_END).toBeGreaterThan(TALK_AT);
	});
});

describe("rows", () => {
	it("opens a row, and closes the open one", () => {
		expect(toggled(null, "sup")).toBe("sup");
		expect(toggled("talk", "sup")).toBe("sup");
		expect(toggled("sup", "sup")).toBeNull();
	});

	it("scrolls to the end the content will have once both rows move", () => {
		// Talk (112) closes, Support (168) opens: 56 taller.
		expect(
			scrollTargetFor({
				contentH: 700,
				next: "sup",
				nextH: 168,
				prevH: 112,
				viewH: 500,
			})
		).toBe(256);
	});

	it("never scrolls above the top", () => {
		expect(
			scrollTargetFor({
				contentH: 300,
				next: "you",
				nextH: 118,
				prevH: 0,
				viewH: 600,
			})
		).toBe(0);
	});

	it("doesn't scroll for Talk", () => {
		expect(
			scrollTargetFor({
				contentH: 900,
				next: "talk",
				nextH: 112,
				prevH: 168,
				viewH: 400,
			})
		).toBeNull();
	});
});

describe("keepTalkingLabel", () => {
	it("names the free week on yearly when it has one", () => {
		expect(keepTalkingLabel("annual", TRIAL_ONLY)).toBe(
			"Keep talking · 7 days free"
		);
	});

	it("promises no week the store won't give", () => {
		expect(keepTalkingLabel("annual", OFFERS_USED)).toBe("Keep talking");
	});

	it("follows the plan picked, with its discount", () => {
		expect(keepTalkingLabel("monthly", TRIAL_AND_DISCOUNT)).toBe(
			"Keep talking · 40% off"
		);
	});
});
