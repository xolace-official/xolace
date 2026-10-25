import { describe, expect, it } from "vitest";
import { decideMirrorOutcome, resolveMirrorTone } from "./mirrorPlan";
import type { ClassificationResult } from "./providers/anthropic";
import type { SafeguardResult } from "./safeguard";

const classification = (
	overrides: Partial<ClassificationResult> = {}
): ClassificationResult => ({
	intensity: 5,
	primaryEmotion: "sadness",
	primaryEmotionConfidence: 0.8,
	requiresFollowUp: false,
	specificity: 7,
	supportNeed: "none",
	thematicTags: [],
	userLanguageTags: [],
	...overrides,
});

const safeguard = (
	overrides: Partial<SafeguardResult> = {}
): SafeguardResult => ({
	actionTaken: "resources_shown",
	isCrisis: false,
	isEscalation: false,
	level: "none",
	resourcesPresented: [],
	riskFlag: false,
	shouldReject: false,
	triggerConfidence: 0,
	triggerEvidence: "",
	...overrides,
});

const decide = (input?: Partial<Parameters<typeof decideMirrorOutcome>[0]>) =>
	decideMirrorOutcome({
		classification: classification(),
		entryType: "open_prompt",
		isPremium: false,
		profileReachedToday: false,
		rawMirrorTone: undefined,
		safeguard: safeguard(),
		...input,
	});

describe("resolveMirrorTone", () => {
	it("defaults to adaptive", () => {
		expect(resolveMirrorTone(undefined, false)).toBe("adaptive");
	});

	it("downgrades witnessed when not premium", () => {
		expect(resolveMirrorTone("witnessed", false)).toBe("adaptive");
	});

	it("keeps witnessed for premium", () => {
		expect(resolveMirrorTone("witnessed", true)).toBe("witnessed");
	});

	it("passes non-premium tones through unchanged", () => {
		expect(resolveMirrorTone("poetic", false)).toBe("poetic");
	});
});

describe("decideMirrorOutcome", () => {
	it("threads the tone downgrade into the plan", () => {
		expect(decide({ isPremium: false, rawMirrorTone: "witnessed" }).tone).toBe(
			"adaptive"
		);
	});

	it("threads claim strength from routeClaimStrength", () => {
		expect(
			decide({
				classification: classification({
					primaryEmotionConfidence: 0.9,
					specificity: 8,
				}),
			}).claimStrength
		).toBe("confident");
	});

	it("reaches on a faint session with no memory connection", () => {
		expect(
			decide({ classification: classification({ specificity: 2 }) })
				.claimStrength
		).toBe("reaching");
	});

	it("passes the gate's guards through — escalation and the same-day reach", () => {
		const faint = classification({ specificity: 2 });
		expect(
			decide({
				classification: faint,
				safeguard: safeguard({
					isEscalation: true,
					level: "crisis",
					triggerType: "explicit_crisis_language",
				}),
			}).claimStrength
		).toBe("measured");
		expect(
			decide({ classification: faint, profileReachedToday: true }).claimStrength
		).toBe("measured");
		expect(
			decide({ classification: faint, episodicTopScore: 0.9 }).claimStrength
		).toBe("measured");
	});

	it("mirrors the safeguard consequence flags", () => {
		const plan = decide({
			safeguard: safeguard({
				isCrisis: true,
				isEscalation: true,
				level: "crisis",
				riskFlag: true,
				triggerType: "explicit_crisis_language",
			}),
		});
		expect(plan.isEscalation).toBe(true);
		expect(plan.riskFlag).toBe(true);
		expect(plan.isCrisis).toBe(true);
	});

	it("requires follow-up on escalation even when the classifier says no", () => {
		expect(
			decide({ safeguard: safeguard({ isEscalation: true }) }).requiresFollowUp
		).toBe(true);
	});

	it("requires follow-up when the classifier asks for it", () => {
		expect(
			decide({ classification: classification({ requiresFollowUp: true }) })
				.requiresFollowUp
		).toBe(true);
	});

	it("requires no follow-up otherwise", () => {
		expect(decide().requiresFollowUp).toBe(false);
	});

	it("falls back to reset when classifier confidence is below 0.6", () => {
		expect(
			decide({
				classification: classification({ primaryEmotionConfidence: 0.5 }),
			}).exerciseTitle
		).toBe("reset");
	});

	it("uses the top-ranked exercise when confidence is sufficient", () => {
		expect(decide().exerciseTitle).toBe("let_it_land");
	});
});
