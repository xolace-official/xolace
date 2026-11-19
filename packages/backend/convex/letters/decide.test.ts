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
	fixable: null,
	hostile: false,
	language: "en",
};

const decide = (
	safety: WordsVerdict,
	verdict: LetterVerdict | null,
	pattern: "contact" | "link" | null = null
) => decideLetterCheck({ pattern, safety, verdict });

describe("decideLetterCheck", () => {
	it("passes a kind letter both halves read", () => {
		expect(decide(SAFE, KIND)).toEqual({ kind: "pass" });
	});

	it.each(["elevated", "crisis"] as const)(
		"answers risk at %s, with the peak as evidence",
		(level) => {
			expect(decide({ ...SAFE, level, peak: PEAK }, KIND)).toEqual({
				kind: "risk",
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
		).toEqual({ kind: "risk", peak: PEAK });
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
