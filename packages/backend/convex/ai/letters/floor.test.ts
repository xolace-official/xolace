/**
 * The letters phrase floor (owner, 19 Nov 2026): past-tense and third-person
 * mentions are left to moderation and the safeguard; a present-tense,
 * first-person phrase still raises as talk's does. Intake's floor is
 * unchanged. Fail-safe: a cut mention passes only when the letters classifier
 * says every mention is past or someone else's. The model and moderation are
 * stubbed.
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
import { discountedPeak, letterPhrasePeak } from "./floor";

const CLEAN: ModerationResult = {
	categories: EMPTY_CATEGORIES,
	categoryScores: {},
	flagged: false,
};

const stub = {
	moderation: CLEAN,
	/** The safeguard classifier's reply; an Error is the classifier down. */
	reply: new Error("classifier down") as string | Error,
};

vi.mock("../providers/moderation", async (orig) => ({
	...(await orig<typeof import("../providers/moderation")>()),
	moderateInput: () => Promise.resolve(stub.moderation),
}));
// The safeguard's classifier is down unless a test answers for it, so the
// engine is moderation alone: the floor is what these tests see.
vi.mock("../providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../providers/anthropic")>()),
	...(await import("../../test/mocks.helpers")).anthropicMock(() => stub.reply),
}));

beforeEach(() => {
	stub.moderation = CLEAN;
	stub.reply = new Error("classifier down");
});

/** The classifier's kind verdict: every mention is past or someone else's. */
const KIND: LetterVerdict = {
	crisisMention: "past_or_others",
	fixable: null,
	hostile: false,
	language: "en",
};

/**
 * The whole check with the letters floor; the classifier answers `verdict`
 * (kind and confirming by default, `null` when it's silent).
 */
const check = (text: string, verdict: LetterVerdict | null = KIND) =>
	checkLetterText(text, {
		classify: () => Promise.resolve(verdict),
		safety: (t) => checkWordsSafety(t, letterPhrasePeak),
	});

/**
 * Present-tense crisis that an earlier floor cut to nothing (review of #857):
 * "I'm used to", a clause joined by and/so/but, and recent attempts. Each with
 * the level talk's floor gives it, which the letters floor must keep.
 */
const PRESENT: [string, "crisis" | "elevated"][] = [
	["I'm used to wanting to kill myself.", "crisis"],
	["I'm so used to it and I'll kill myself.", "crisis"],
	["I'm used to it so I'll end my life.", "crisis"],
	["I barely survived today and will kill myself.", "crisis"],
	["I tried to and will end my life.", "crisis"],
	["I'm used to feeling suicidal.", "elevated"],
	["I survived today and I want to die.", "elevated"],
	["I tried to stop but want to die.", "elevated"],
	["I lost my job and I'm close to suicide.", "elevated"],
	["Honestly it's suicide or nothing for me now.", "elevated"],
	["I tried to kill myself last week.", "crisis"],
	["I tried to kill myself two days ago.", "crisis"],
	["It happened last night. I tried to end my life.", "crisis"],
];

/**
 * A floor cut must never drop crisis to elevated (review of #857): each keeps
 * talk's crisis on its present-tense clause.
 */
const CRISIS_BESIDE_A_CUT = [
	"I survived today wanting to kill myself. I want to die.",
	"I tried to kill myself and I want to die.",
	"I tried to take my life back but I want to die.",
];

/** Moderation's scores on the owner's "used to" letter (Letters eval). */
const PAST_SELF_HARM: ModerationResult = {
	categories: EMPTY_CATEGORIES,
	categoryScores: {
		"self-harm": 0.452,
		"self-harm/instructions": 0,
		"self-harm/intent": 0.605,
	},
	flagged: false,
};

/** The safeguard classifier's reading of that letter (Letters eval). */
const QUIETLY_SAD = JSON.stringify({
	granularLabel: "sad",
	intensity: 4,
	primaryEmotion: "sadness",
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

	it.each([
		"I tried to hold on, I can't anymore, I want to end my life.",
		"A week ago I lost my job and I want to kill myself.",
		"Since my brother's suicide I want to kill myself too.",
		"I tried to end my life last night.",
		"I attempted to kill myself again today.",
	])("a marker elsewhere doesn't hide a present crisis: %s", (text) => {
		expect(phrasePeak(text.toLowerCase())?.level).toBe("crisis");
		expect(letterPhrasePeak(text)?.level).toBe("crisis");
	});

	it("cuts only the mention, so a second phrase in the same clause still counts", () => {
		expect(
			letterPhrasePeak(
				"I used to think about hurting myself and now I want to die"
			)?.level
		).toBe("elevated");
	});

	it("keeps a present-tense distress phrase at elevated", () => {
		expect(letterPhrasePeak("Some nights I feel suicidal.")?.level).toBe(
			"elevated"
		);
	});
});

describe("letterPhrasePeak on present-tense crisis", () => {
	it.each(PRESENT)("keeps talk's level: %s", (text, level) => {
		expect(phrasePeak(text.toLowerCase())?.level).toBe(level);
		expect(letterPhrasePeak(text)?.level).toBe(level);
		expect(discountedPeak(text)).toBeNull();
	});
});

describe("discountedPeak", () => {
	it.each(MENTIONS)("is talk's peak when a mention was cut: %s", (text) => {
		expect(discountedPeak(text)).toEqual(phrasePeak(text));
	});

	it("is null for a letter with no phrase at all", () => {
		expect(discountedPeak("You are not alone tonight.")).toBeNull();
	});
});

describe("the letters check with its floor", () => {
	it.each(MENTIONS)(
		"passes a mention when the engine says none and the classifier confirms it's past: %s",
		async (text) => {
			expect(await check(text)).toEqual({ kind: "pass" });
		}
	);

	// The fail-safe: the floor's cut alone never passes a letter. Remove the
	// guard in `decideLetterCheck` and these go red.
	it.each(MENTIONS)(
		"routes a cut mention to risk when the classifier is silent: %s",
		async (text) => {
			expect(await check(text, null)).toEqual({
				kind: "risk",
				peak: phrasePeak(text),
			});
		}
	);

	it.each(["none", "current"] as const)(
		"routes a cut mention to risk when the classifier says %s",
		async (crisisMention) => {
			for (const text of MENTIONS) {
				expect(await check(text, { ...KIND, crisisMention })).toMatchObject({
					kind: "risk",
				});
			}
		}
	);

	it.each(PRESENT)(
		"routes present-tense crisis to risk, the classifier silent or not: %s",
		async (text, level) => {
			for (const verdict of [null, KIND]) {
				expect(await check(text, verdict)).toMatchObject({
					kind: "risk",
					peak: { level },
				});
			}
		}
	);

	it("still routes a present-tense crisis phrase to risk", async () => {
		expect(await check("I'm going to end my life tonight.")).toMatchObject({
			kind: "risk",
			peak: { level: "crisis" },
		});
	});

	// Both halves of the safety engine are down here; `read.test.ts` proves
	// moderation alone being down is reported (decision 2).
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

	it.each(CRISIS_BESIDE_A_CUT)(
		"keeps crisis beside a cut mention, whatever the classifier says: %s",
		async (text) => {
			expect(phrasePeak(text.toLowerCase())?.level).toBe("crisis");
			for (const verdict of [
				null,
				KIND,
				{ ...KIND, crisisMention: "none" as const },
				{ ...KIND, crisisMention: "current" as const },
			]) {
				expect(await check(text, verdict)).toMatchObject({
					kind: "risk",
					peak: { level: "crisis" },
				});
			}
		}
	);

	it("cuts someone else's death by suicide named with a noun", async () => {
		const text =
			"My friend died by suicide, and I still talk to her some nights.";
		expect(letterPhrasePeak(text)).toBeNull();
		expect(discountedPeak(text)).not.toBeNull();
		expect(await check(text)).toEqual({ kind: "pass" });
		expect(await check(text, null)).toMatchObject({ kind: "risk" });
	});

	describe("a past mention moderation's self-harm scores flag (owner)", () => {
		const USED_TO = MENTIONS[2] ?? "";

		beforeEach(() => {
			stub.moderation = PAST_SELF_HARM;
			stub.reply = QUIETLY_SAD;
		});

		it("passes when the classifier confirms it's past", async () => {
			expect(await check(USED_TO)).toEqual({ kind: "pass" });
		});

		it.each([null, "none", "current"] as const)(
			"is risk when the classifier answers %s",
			async (crisisMention) => {
				expect(
					await check(
						USED_TO,
						crisisMention ? { ...KIND, crisisMention } : null
					)
				).toMatchObject({ kind: "risk", peak: { level: "elevated" } });
			}
		);

		it("is risk when moderation reads crisis", async () => {
			stub.moderation = {
				...PAST_SELF_HARM,
				categoryScores: { "self-harm": 0.452, "self-harm/intent": 0.85 },
			};
			expect(await check(USED_TO)).toMatchObject({
				kind: "risk",
				peak: { level: "crisis" },
			});
		});

		it("is risk when the classifier's intensity raised it", async () => {
			stub.moderation = CLEAN;
			stub.reply = JSON.stringify({
				granularLabel: "despair",
				intensity: 9,
				primaryEmotion: "sadness",
			});
			expect(await check(USED_TO)).toMatchObject({
				kind: "risk",
				peak: { level: "elevated" },
			});
		});
	});
});
