import { describe, expect, it } from "vitest";
import { parseClassificationResponse } from "./anthropic";

const BASE = {
	intensity: 6,
	primaryEmotion: "sadness",
	primaryEmotionConfidence: 0.8,
	specificity: 5,
	supportNeed: "none",
	thematicTags: [],
	userLanguageTags: [],
};

const parse = (fields: Record<string, unknown>) =>
	parseClassificationResponse(JSON.stringify({ ...BASE, ...fields }));

describe("parseClassificationResponse — the follow-up read", () => {
	it("a yes keeps its code and reason, and drops a no reason", () => {
		const r = parse({
			followUpReason: " Lost her father recently. ",
			followUpReasonCode: "grief",
			noFollowUpReason: "should not survive",
			requiresFollowUp: true,
		});
		expect(r.requiresFollowUp).toBe(true);
		expect(r.followUpReasonCode).toBe("grief");
		expect(r.followUpReason).toBe("Lost her father recently.");
		expect(r.noFollowUpReason).toBeUndefined();
	});

	it("a no keeps its code and no reason, and drops a yes reason", () => {
		const r = parse({
			followUpReason: "should not survive",
			followUpReasonCode: "future_worry",
			noFollowUpReason: "Worry about tomorrow; grounding, not a check-in.",
			requiresFollowUp: false,
		});
		expect(r.requiresFollowUp).toBe(false);
		expect(r.followUpReasonCode).toBe("future_worry");
		expect(r.noFollowUpReason).toBe(
			"Worry about tomorrow; grounding, not a check-in."
		);
		expect(r.followUpReason).toBeUndefined();
	});

	it("every classification gets a code: unknown when missing or contradictory", () => {
		expect(parse({ requiresFollowUp: false }).followUpReasonCode).toBe(
			"unknown"
		);
		expect(
			parse({ followUpReasonCode: "stuck", requiresFollowUp: false })
				.followUpReasonCode
		).toBe("unknown");
		// The flag itself is never changed by the code.
		expect(
			parse({ followUpReasonCode: "stuck", requiresFollowUp: false })
				.requiresFollowUp
		).toBe(false);
	});

	it("blank or null reasons are dropped", () => {
		const r = parse({
			followUpReasonCode: "no_trigger",
			noFollowUpReason: "   ",
			requiresFollowUp: false,
		});
		expect(r.noFollowUpReason).toBeUndefined();
		expect(
			parse({ noFollowUpReason: null, requiresFollowUp: false })
				.noFollowUpReason
		).toBeUndefined();
	});
});
