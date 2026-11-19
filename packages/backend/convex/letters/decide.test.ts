import { describe, expect, it, vi } from "vitest";
import type { WordsVerdict } from "../ai/intake/read";
import type { LetterVerdict } from "../ai/letters/check";
import type { TalkPeak } from "../ai/safeguard";
import { checkLetterText, decideLetterCheck } from "./decide";
import { FIXABLE_CATEGORIES, FIXABLE_LINES } from "./lines";

const SAFE: WordsVerdict = { level: "none", resources: [], unavailable: false };
const SAFETY_DOWN: WordsVerdict = {
	level: "none",
	resources: [],
	unavailable: true,
};
const PEAK: TalkPeak = {
	level: "crisis",
	triggerConfidence: 0.9,
	triggerEvidence: "crisis phrase",
	triggerType: "explicit_crisis_language",
};
const KIND: LetterVerdict = {
	crisisMention: "none",
	fixable: null,
	hostile: false,
	language: "en",
};

const decide = (
	safety: WordsVerdict,
	verdict: LetterVerdict | null,
	pattern: "contact" | "link" | null = null
) =>
	decideLetterCheck({
		discounted: null,
		pattern,
		remainder: null,
		safety,
		verdict,
	});

describe("decideLetterCheck", () => {
	it("passes a kind letter both halves read", () => {
		expect(decide(SAFE, KIND)).toEqual({ kind: "pass" });
	});

	it.each(["elevated", "crisis"] as const)(
		"answers risk at %s, with the peak as evidence",
		(level) => {
			expect(decide({ ...SAFE, level, peak: PEAK }, KIND)).toEqual({
				kind: "risk",
				level,
				peak: PEAK,
			});
		}
	);

	it("a gentle level is not risk", () => {
		expect(decide({ ...SAFE, level: "gentle" }, KIND)).toEqual({
			kind: "pass",
		});
	});

	it("risk comes before everything, even an outage or a hostile letter", () => {
		const risk = { ...SAFE, level: "crisis" as const, peak: PEAK };
		expect(decide(risk, null).kind).toBe("risk");
		expect(decide(risk, { ...KIND, hostile: true }).kind).toBe("risk");
		expect(decide(risk, null, "contact").kind).toBe("risk");
	});

	it("holds a hostile letter before asking anything else of it", () => {
		expect(
			decide(SAFE, {
				...KIND,
				fixable: "contact",
				hostile: true,
				language: "fr",
			})
		).toEqual({ kind: "held" });
	});

	it("holds a letter moderation rejects, even when the classifier passed it", () => {
		expect(decide({ ...SAFE, rejected: true }, KIND)).toEqual({ kind: "held" });
		expect(decide({ ...SAFE, rejected: true }, null)).toEqual({
			kind: "held",
		});
	});

	it("holds a hostile letter rather than returning its contact details", () => {
		expect(decide(SAFE, { ...KIND, hostile: true }, "contact")).toEqual({
			kind: "held",
		});
		expect(decide({ ...SAFE, rejected: true }, KIND, "link")).toEqual({
			kind: "held",
		});
	});

	it("a crisis still comes before a rejection", () => {
		expect(
			decide({ ...SAFE, level: "crisis", peak: PEAK, rejected: true }, KIND)
				.kind
		).toBe("risk");
	});

	it("holds a hostile letter even when the safety half is down", () => {
		expect(decide(SAFETY_DOWN, { ...KIND, hostile: true })).toEqual({
			kind: "held",
		});
	});

	it("returns a letter in another language", () => {
		expect(decide(SAFE, { ...KIND, language: "fr" })).toEqual({
			kind: "lang",
			language: "fr",
		});
	});

	it("an unknown language is not a reason to return a letter", () => {
		expect(decide(SAFE, { ...KIND, language: "und" })).toEqual({
			kind: "pass",
		});
	});

	it("returns a fixable letter with its category", () => {
		expect(decide(SAFE, { ...KIND, fixable: "medical" })).toEqual({
			category: "medical",
			kind: "fixable",
		});
	});

	it("a pattern hit is fixable even when the classifier is down", () => {
		expect(decide(SAFE, null, "link")).toEqual({
			category: "link",
			kind: "fixable",
		});
	});

	it("is unavailable when either half couldn't finish", () => {
		expect(decide(SAFETY_DOWN, KIND)).toEqual({ kind: "unavailable" });
		expect(decide(SAFE, null)).toEqual({ kind: "unavailable" });
		expect(decide(SAFETY_DOWN, null)).toEqual({ kind: "unavailable" });
	});

	describe("a mention the letters floor cut (fail-safe)", () => {
		const cut = (verdict: LetterVerdict | null) =>
			decideLetterCheck({
				discounted: PEAK,
				pattern: null,
				remainder: null,
				safety: SAFE,
				verdict,
			});

		it("passes only when the classifier says every mention is past or someone else's", () => {
			expect(cut({ ...KIND, crisisMention: "past_or_others" })).toEqual({
				kind: "pass",
			});
		});

		it.each(["none", "current"] as const)(
			"is risk at the uncut level when the classifier says %s",
			(crisisMention) => {
				expect(cut({ ...KIND, crisisMention })).toEqual({
					kind: "risk",
					peak: PEAK,
				});
			}
		);

		it("is risk, never pass or unavailable, when the classifier is silent", () => {
			expect(cut(null)).toEqual({ kind: "risk", peak: PEAK });
		});

		it("comes before a hostile verdict or a pattern hit", () => {
			expect(
				decideLetterCheck({
					discounted: PEAK,
					pattern: "contact",
					remainder: null,
					safety: SAFE,
					verdict: { ...KIND, hostile: true },
				}).kind
			).toBe("risk");
		});
	});

	describe("routes a cut letter at the higher of the engine's and the uncut level", () => {
		const ELEVATED_PEAK: TalkPeak = { ...PEAK, level: "elevated" };

		it.each([null, "past_or_others", "current"] as const)(
			"keeps crisis when the cut left elevated (classifier %s)",
			(crisisMention) => {
				expect(
					decideLetterCheck({
						discounted: PEAK,
						pattern: null,
						remainder: ELEVATED_PEAK,
						safety: { ...SAFE, level: "elevated", peak: ELEVATED_PEAK },
						verdict: crisisMention ? { ...KIND, crisisMention } : null,
					})
				).toEqual({ kind: "risk", peak: PEAK });
			}
		);

		it("keeps the engine's crisis over a lower uncut level", () => {
			expect(
				decideLetterCheck({
					discounted: ELEVATED_PEAK,
					pattern: null,
					remainder: null,
					safety: { ...SAFE, level: "crisis", peak: PEAK },
					verdict: { ...KIND, crisisMention: "past_or_others" },
				})
			).toEqual({ kind: "risk", peak: PEAK });
		});
	});

	describe("a past mention moderation's self-harm scores flagged (owner)", () => {
		const ELEVATED_PEAK: TalkPeak = { ...PEAK, level: "elevated" };
		const FLAGGED: WordsVerdict = {
			...SAFE,
			level: "elevated",
			peak: ELEVATED_PEAK,
			selfHarmScoresOnly: true,
		};
		const flagged = (
			change: Partial<Parameters<typeof decideLetterCheck>[0]> = {}
		) =>
			decideLetterCheck({
				discounted: ELEVATED_PEAK,
				pattern: null,
				remainder: null,
				safety: FLAGGED,
				verdict: { ...KIND, crisisMention: "past_or_others" },
				...change,
			});

		it("passes when all four hold", () => {
			expect(flagged()).toEqual({ kind: "pass" });
		});

		it("still holds, returns or fixes it after that", () => {
			expect(
				flagged({
					verdict: {
						...KIND,
						crisisMention: "past_or_others",
						fixable: "medical",
					},
				})
			).toEqual({ category: "medical", kind: "fixable" });
		});

		// Each of the four conditions, dropped in turn, is risk.
		it("1: never at crisis", () => {
			expect(
				flagged({ safety: { ...FLAGGED, level: "crisis", peak: PEAK } })
			).toEqual({ kind: "risk", peak: PEAK });
		});

		it("2: only when the floor cut a mention", () => {
			expect(flagged({ discounted: null })).toEqual({
				kind: "risk",
				peak: ELEVATED_PEAK,
			});
		});

		it("2: only when what's left after the cut raises nothing", () => {
			expect(flagged({ remainder: ELEVATED_PEAK })).toEqual({
				kind: "risk",
				peak: ELEVATED_PEAK,
			});
		});

		it("3: only when moderation's self-harm scores alone raised it", () => {
			const { selfHarmScoresOnly: _, ...byIntensity } = FLAGGED;
			expect(flagged({ safety: byIntensity })).toEqual({
				kind: "risk",
				peak: ELEVATED_PEAK,
			});
		});

		it.each([null, "none", "current"] as const)(
			"4: only when the classifier answered past_or_others, not %s",
			(crisisMention) => {
				expect(
					flagged({
						verdict: crisisMention ? { ...KIND, crisisMention } : null,
					})
				).toEqual({ kind: "risk", peak: ELEVATED_PEAK });
			}
		);
	});

	it("is unavailable when moderation is down, even if the safeguard answered", () => {
		expect(decide({ ...SAFE, moderationUnavailable: true }, KIND)).toEqual({
			kind: "unavailable",
		});
	});
});

describe("checkLetterText", () => {
	const deps = (verdict: LetterVerdict | null, safety = SAFE) => ({
		classify: vi.fn(async () => verdict),
		safety: vi.fn(async () => safety),
	});

	it("asks both halves of a letter with nothing the patterns find", async () => {
		const d = deps(KIND);
		expect(await checkLetterText("You are not alone tonight.", d)).toEqual({
			kind: "pass",
		});
		expect(d.safety).toHaveBeenCalledOnce();
		expect(d.classify).toHaveBeenCalledOnce();
	});

	it("still asks the classifier when the patterns find contact details", async () => {
		const d = deps(KIND);
		expect(await checkLetterText("text me on 0244 123 4567", d)).toEqual({
			category: "contact",
			kind: "fixable",
		});
		expect(d.classify).toHaveBeenCalledOnce();
	});

	it("holds a hostile letter the patterns also caught", async () => {
		const d = deps({ ...KIND, hostile: true });
		expect(
			await checkLetterText("you're pathetic, text me 0244 123 4567", d)
		).toEqual({ kind: "held" });
	});

	it("reads a classifier that throws as unavailable, never a pass", async () => {
		const d = {
			classify: vi.fn(async () => {
				throw new Error("down");
			}),
			safety: vi.fn(async () => SAFE),
		};
		expect(await checkLetterText("You are not alone tonight.", d)).toEqual({
			kind: "unavailable",
		});
	});

	it("reads a safety half that throws as unavailable", async () => {
		const d = {
			classify: vi.fn(async () => KIND),
			safety: vi.fn(async () => {
				throw new Error("down");
			}),
		};
		expect(await checkLetterText("You are not alone tonight.", d)).toEqual({
			kind: "unavailable",
		});
	});

	it("still checks the sender's safety when the patterns find something", async () => {
		const d = deps(KIND, { ...SAFE, level: "crisis", peak: PEAK });
		expect(
			await checkLetterText("call me 0244 123 4567, i won't be here", d)
		).toEqual({ kind: "risk", level: "crisis", peak: PEAK });
		expect(d.safety).toHaveBeenCalledOnce();
	});

	it("returns a link the classifier missed", async () => {
		const d = deps(KIND);
		expect(
			await checkLetterText("this helped: https://example.org", d)
		).toEqual({ category: "link", kind: "fixable" });
	});
});

describe("FIXABLE_LINES", () => {
	it("has one line per category, none empty", () => {
		for (const category of FIXABLE_CATEGORIES) {
			expect(FIXABLE_LINES[category].length).toBeGreaterThan(0);
		}
	});
});
