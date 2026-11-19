/**
 * The letters phrase floor (owner, 19 Nov 2026): past-tense and third-person
 * mentions are left to moderation and the safeguard; a present-tense,
 * first-person phrase still raises as talk's does. Intake's floor is
 * unchanged. The model and moderation are stubbed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkLetterText } from "../../letters/decide";
import { phrasePeak } from "../../talk/safety";
import { checkWordsSafety } from "../intake/read";
import {
	EMPTY_CATEGORIES,
	MODERATION_UNAVAILABLE,
	type ModerationResult,
} from "../providers/moderation";
import type { LetterVerdict } from "./check";
import { letterPhrasePeak } from "./floor";

const CLEAN: ModerationResult = {
	categories: EMPTY_CATEGORIES,
	categoryScores: {},
	flagged: false,
};

const stub = { moderation: CLEAN };

vi.mock("../providers/moderation", async (orig) => ({
	...(await orig<typeof import("../providers/moderation")>()),
	moderateInput: () => Promise.resolve(stub.moderation),
}));
// The safeguard's classifier is down, so the engine is moderation alone: the
// floor is what these tests see.
vi.mock("../providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../providers/anthropic")>()),
	getAnthropicClient: () => ({
		messages: {
			create: () => Promise.reject(new Error("classifier down")),
		},
	}),
}));

beforeEach(() => {
	stub.moderation = CLEAN;
});

const KIND: LetterVerdict = { fixable: null, hostile: false, language: "en" };

/** The whole check with the letters floor, the classifier answering kind. */
const check = (text: string) =>
	checkLetterText(text, {
		classify: () => Promise.resolve(KIND),
		safety: (t) => checkWordsSafety(t, letterPhrasePeak),
	});

const MENTIONS = [
	"A few years ago I tried to end my life. I'm still here, and some days are good now.",
	"I lost my brother to suicide, and for a long time I didn't think I'd laugh again.",
	"I used to think about hurting myself most nights. It got quieter once I told someone.",
];

describe("letterPhrasePeak", () => {
	it.each(MENTIONS)("leaves a mention to the engine: %s", (text) => {
		expect(letterPhrasePeak(text)).toBeNull();
		// Intake's floor still raises on the same words.
		expect(phrasePeak(text.toLowerCase())).not.toBeNull();
	});

	it("raises a present-tense crisis phrase exactly as talk's floor does", () => {
		const text = "I want to kill myself tonight.";
		expect(letterPhrasePeak(text)).toEqual(phrasePeak(text.toLowerCase()));
		expect(letterPhrasePeak(text)?.level).toBe("crisis");
	});

	it("raises on the present-tense sentence beside a past one", () => {
		expect(
			letterPhrasePeak(
				"A few years ago I tried to end my life. Tonight I want to kill myself."
			)?.level
		).toBe("crisis");
	});

	it("splits a past clause from a present one in the same sentence", () => {
		expect(
			letterPhrasePeak("I used to be fine, but now I want to end my life.")
				?.level
		).toBe("crisis");
	});

	it("keeps a present-tense distress phrase at elevated", () => {
		expect(letterPhrasePeak("Some nights I feel suicidal.")?.level).toBe(
			"elevated"
		);
	});
});

describe("the letters check with its floor", () => {
	it.each(MENTIONS)(
		"passes a mention when the engine says none: %s",
		async (text) => {
			expect(await check(text)).toEqual({ kind: "pass" });
		}
	);

	it("still routes a present-tense crisis phrase to risk", async () => {
		expect(await check("I'm going to end my life tonight.")).toMatchObject({
			kind: "risk",
			peak: { level: "crisis" },
		});
	});

	it("is unavailable when moderation can't answer, even with the classifier's verdict", async () => {
		stub.moderation = MODERATION_UNAVAILABLE;
		expect(await check(MENTIONS[0] ?? "")).toEqual({ kind: "unavailable" });
	});

	it("still answers risk on a crisis phrase while moderation is down", async () => {
		stub.moderation = MODERATION_UNAVAILABLE;
		expect(await check("I want to kill myself.")).toMatchObject({
			kind: "risk",
		});
	});
});
