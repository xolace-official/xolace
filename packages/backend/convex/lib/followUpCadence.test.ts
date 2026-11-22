import { describe, expect, it } from "vitest";
import {
	abandonRequiresFollowUp,
	classifierFlaggedFollowUp,
	computeRequiresFollowUp,
	FOLLOW_UP_NO_CODES,
	FOLLOW_UP_YES_CODES,
	followUpCadence,
	followUpDecisionSource,
	followUpTier,
	isCardWaiting,
	minReturnGapForTier,
	parseFollowUpReasonCode,
	refinedFollowUpRead,
	shouldEmitReturn,
	shouldSupersede,
	WAITING_CARD_LIFETIME_MS,
	waitingSince,
} from "./followUpCadence";

describe("followUpTier", () => {
	it("maps safeguard crisis to acute (overrides everything)", () => {
		expect(followUpTier({ intensity: 2, safeguardLevel: "crisis" })).toBe(
			"acute"
		);
	});

	it("maps safeguard elevated to elevated", () => {
		expect(followUpTier({ intensity: 3, safeguardLevel: "elevated" })).toBe(
			"elevated"
		);
	});

	it("maps grief at intensity >= 7 to elevated", () => {
		expect(followUpTier({ intensity: 8, primaryEmotion: "grief" })).toBe(
			"elevated"
		);
	});

	it("maps shame granularLabel at intensity >= 7 to elevated", () => {
		expect(
			followUpTier({
				granularLabel: "shame",
				intensity: 7,
				primaryEmotion: "anger",
			})
		).toBe("elevated");
	});

	it("reads free-text granular labels through the emotion aliases (#536)", () => {
		expect(
			followUpTier({
				granularLabel: "sorrow",
				intensity: 8,
				primaryEmotion: "confusion",
			})
		).toBe("elevated");
		expect(
			followUpTier({
				granularLabel: "Ashamed",
				intensity: 7,
				primaryEmotion: "confusion",
			})
		).toBe("elevated");
	});

	it("keeps grief BELOW intensity 7 as standard", () => {
		expect(followUpTier({ intensity: 6, primaryEmotion: "grief" })).toBe(
			"standard"
		);
	});

	it("maps gave_up to elevated regardless of intensity", () => {
		expect(followUpTier({ confirmationState: "gave_up", intensity: 2 })).toBe(
			"elevated"
		);
	});

	it("falls through to standard for a plain classifier flag", () => {
		expect(followUpTier({ intensity: 5, primaryEmotion: "anxiety" })).toBe(
			"standard"
		);
	});

	it("treats gentle/none safeguard as non-acute", () => {
		expect(followUpTier({ intensity: 5, safeguardLevel: "gentle" })).toBe(
			"standard"
		);
		expect(followUpTier({ intensity: 5, safeguardLevel: "none" })).toBe(
			"standard"
		);
	});
});

describe("followUpCadence durations", () => {
	it("acute: 45m / +4h / 48h", () => {
		const c = followUpCadence({ safeguardLevel: "crisis" });
		expect(c.tier).toBe("acute");
		expect(c.stage1Ms).toBe(45 * 60 * 1000);
		expect(c.stage2Ms).toBe(4 * 60 * 60 * 1000);
		expect(c.expiryMs).toBe(48 * 60 * 60 * 1000);
	});

	it("elevated: 12h / +1d / 7d", () => {
		const c = followUpCadence({ confirmationState: "gave_up" });
		expect(c.tier).toBe("elevated");
		expect(c.stage1Ms).toBe(12 * 60 * 60 * 1000);
		expect(c.stage2Ms).toBe(24 * 60 * 60 * 1000);
		expect(c.expiryMs).toBe(7 * 24 * 60 * 60 * 1000);
	});

	it("standard: 24h / +3d / 14d", () => {
		const c = followUpCadence({ intensity: 5, primaryEmotion: "anxiety" });
		expect(c.tier).toBe("standard");
		expect(c.stage1Ms).toBe(24 * 60 * 60 * 1000);
		expect(c.stage2Ms).toBe(3 * 24 * 60 * 60 * 1000);
		expect(c.expiryMs).toBe(14 * 24 * 60 * 60 * 1000);
	});
});

describe("shouldSupersede (weight-aware)", () => {
	it("equal weight refreshes", () => {
		expect(shouldSupersede("acute", "acute")).toBe(true);
		expect(shouldSupersede("standard", "standard")).toBe(true);
	});

	it("higher weight supersedes", () => {
		expect(shouldSupersede("acute", "elevated")).toBe(true);
		expect(shouldSupersede("elevated", "standard")).toBe(true);
	});

	it("lower weight does NOT supersede (standard cannot cancel acute)", () => {
		expect(shouldSupersede("standard", "acute")).toBe(false);
		expect(shouldSupersede("elevated", "acute")).toBe(false);
	});
});

describe("computeRequiresFollowUp", () => {
	it("true when stored flag is set", () => {
		expect(computeRequiresFollowUp({ storedFlag: true })).toBe(true);
	});

	it("true when confirmationState is gave_up (only known at completion)", () => {
		expect(computeRequiresFollowUp({ confirmationState: "gave_up" })).toBe(
			true
		);
	});

	it("true when escalationTriggered (belt and braces)", () => {
		expect(computeRequiresFollowUp({ escalationTriggered: true })).toBe(true);
	});

	it("false when nothing qualifies", () => {
		expect(
			computeRequiresFollowUp({
				confirmationState: "confirmed",
				escalationTriggered: false,
				storedFlag: false,
			})
		).toBe(false);
	});

	it("false for empty input", () => {
		expect(computeRequiresFollowUp({})).toBe(false);
	});
});

describe("abandonRequiresFollowUp — IRON rule (T13 regression)", () => {
	it("abandon WITHOUT escalation → NO follow-up", () => {
		expect(abandonRequiresFollowUp({ escalationTriggered: false })).toBe(false);
		expect(abandonRequiresFollowUp({})).toBe(false);
		expect(abandonRequiresFollowUp({ escalationTriggered: null })).toBe(false);
	});

	it("abandon WITH escalation → starts a follow-up", () => {
		expect(abandonRequiresFollowUp({ escalationTriggered: true })).toBe(true);
	});
});

describe("shouldEmitReturn (gap guard)", () => {
	const created = 1_000_000;
	const gap = 8 * 60 * 60 * 1000; // arbitrary explicit tier gap for these cases

	it("does not emit before the min gap", () => {
		expect(
			shouldEmitReturn({
				cardCreatedAt: created,
				cardStatus: "pending",
				minGapMs: gap,
				now: created + gap - 1,
			})
		).toBe(false);
	});

	it("emits once the gap has elapsed on a pending card", () => {
		expect(
			shouldEmitReturn({
				cardCreatedAt: created,
				cardStatus: "pending",
				minGapMs: gap,
				now: created + gap,
			})
		).toBe(true);
	});

	it("never emits for a non-pending card (no re-send after ready)", () => {
		expect(
			shouldEmitReturn({
				cardCreatedAt: created,
				cardStatus: "ready",
				minGapMs: gap,
				now: created + 10 * gap,
			})
		).toBe(false);
	});
});

describe("minReturnGapForTier", () => {
	it("returns each tier's real return gap (no QA override in shipped builds)", () => {
		expect(minReturnGapForTier("acute")).toBe(30 * 60 * 1000); // 30min
		expect(minReturnGapForTier("elevated")).toBe(8 * 60 * 60 * 1000); // 8h
		expect(minReturnGapForTier("standard")).toBe(8 * 60 * 60 * 1000); // 8h
	});
});

describe("waitingSince / isCardWaiting (Coming back v2)", () => {
	const DAY = 24 * 60 * 60 * 1000;
	const now = 100 * DAY;

	it("is 3 days", () => {
		expect(WAITING_CARD_LIFETIME_MS).toBe(3 * DAY);
	});

	it("starts a shown card's wait at its first showing, not the latest", () => {
		const card = {
			createdAt: now - 9 * DAY,
			firstShownAt: now - 2 * DAY,
			shownAt: now,
			status: "shown",
		};
		expect(waitingSince(card)).toBe(now - 2 * DAY);
		expect(isCardWaiting(card, now)).toBe(true);
		expect(isCardWaiting(card, now + DAY)).toBe(false);
	});

	it("starts a ready card's wait when the person came back", () => {
		const card = { createdAt: now - 9 * DAY, readyAt: now, status: "ready" };
		expect(waitingSince(card)).toBe(now);
		expect(isCardWaiting(card, now + 3 * DAY - 1)).toBe(true);
	});

	it("falls back to shownAt, then createdAt, on cards from before B1", () => {
		expect(waitingSince({ createdAt: 1, shownAt: 5, status: "shown" })).toBe(5);
		expect(waitingSince({ createdAt: 1, status: "ready" })).toBe(1);
	});

	it("never counts a pending or closed card", () => {
		for (const status of ["pending", "resolved", "expired", "superseded"]) {
			expect(isCardWaiting({ createdAt: now, status }, now)).toBe(false);
		}
	});
});

describe("parseFollowUpReasonCode", () => {
	it("keeps a code on the same side as the flag", () => {
		for (const code of FOLLOW_UP_YES_CODES) {
			expect(parseFollowUpReasonCode(true, code)).toBe(code);
		}
		for (const code of FOLLOW_UP_NO_CODES) {
			expect(parseFollowUpReasonCode(false, code)).toBe(code);
		}
	});

	it("tolerates case and whitespace", () => {
		expect(parseFollowUpReasonCode(true, "  Grief ")).toBe("grief");
	});

	it("unknown when the code contradicts the flag: the flag wins", () => {
		expect(parseFollowUpReasonCode(false, "grief")).toBe("unknown");
		expect(parseFollowUpReasonCode(true, "future_worry")).toBe("unknown");
		expect(parseFollowUpReasonCode(true, "no_trigger")).toBe("unknown");
	});

	it("unknown when missing, not a string, or not on the list", () => {
		expect(parseFollowUpReasonCode(false, undefined)).toBe("unknown");
		expect(parseFollowUpReasonCode(false, null)).toBe("unknown");
		expect(parseFollowUpReasonCode(true, 3)).toBe("unknown");
		expect(parseFollowUpReasonCode(true, "loneliness")).toBe("unknown");
		// The fallback itself is never accepted from the model.
		expect(parseFollowUpReasonCode(false, "unknown")).toBe("unknown");
	});
});

describe("classifierFlaggedFollowUp", () => {
	it("reads the stored flag", () => {
		expect(classifierFlaggedFollowUp({ aiRequiresFollowUp: true })).toBe(true);
		expect(
			classifierFlaggedFollowUp({
				aiRequiresFollowUp: false,
				noFollowUpReason: "vented",
			})
		).toBe(false);
	});

	it("an older row with only a reason was a yes; with nothing, a no", () => {
		expect(classifierFlaggedFollowUp({ followUpReason: "grief" })).toBe(true);
		expect(classifierFlaggedFollowUp({})).toBe(false);
		expect(classifierFlaggedFollowUp(null)).toBe(false);
	});
});

describe("refinedFollowUpRead (re-classification, raise-only)", () => {
	const earlierNo = {
		aiRequiresFollowUp: false,
		followUpReasonCode: "low_intensity" as const,
		noFollowUpReason: "mild",
	};
	const earlierYes = {
		aiRequiresFollowUp: true,
		followUpReason: "loss of a parent",
		followUpReasonCode: "grief" as const,
	};

	it("a yes replaces a no and drops the no reason", () => {
		const patch = refinedFollowUpRead(earlierNo, {
			aiRequiresFollowUp: true,
			followUpReason: "stuck in it",
			followUpReasonCode: "stuck",
		});
		expect(patch).toEqual({
			aiRequiresFollowUp: true,
			followUpReason: "stuck in it",
			followUpReasonCode: "stuck",
			noFollowUpReason: undefined,
		});
		expect("noFollowUpReason" in patch).toBe(true);
	});

	it("a yes without a sentence keeps the earlier yes sentence", () => {
		const patch = refinedFollowUpRead(earlierYes, {
			aiRequiresFollowUp: true,
			followUpReasonCode: "shame_guilt",
		});
		expect(patch.followUpReasonCode).toBe("shame_guilt");
		expect("followUpReason" in patch).toBe(false);
	});

	it("a no never replaces a yes", () => {
		expect(
			refinedFollowUpRead(earlierYes, {
				aiRequiresFollowUp: false,
				followUpReasonCode: "discharged",
				noFollowUpReason: "vented it out",
			})
		).toEqual({});
		// An older row's yes counts too.
		expect(
			refinedFollowUpRead(
				{ followUpReason: "rupture" },
				{ aiRequiresFollowUp: false, followUpReasonCode: "discharged" }
			)
		).toEqual({});
	});

	it("a no replaces a no, clearing a reason it doesn't give", () => {
		const patch = refinedFollowUpRead(earlierNo, {
			aiRequiresFollowUp: false,
			followUpReasonCode: "future_worry",
		});
		expect(patch).toEqual({
			aiRequiresFollowUp: false,
			followUpReasonCode: "future_worry",
			noFollowUpReason: undefined,
		});
	});
});

describe("followUpDecisionSource", () => {
	const decide = (
		over: Partial<Parameters<typeof followUpDecisionSource>[0]>
	) =>
		followUpDecisionSource({
			classifierFlagged: false,
			requiresFollowUp: true,
			...over,
		});

	it("none when no follow-up, whatever else is set", () => {
		expect(
			decide({
				classifierFlagged: true,
				escalationTriggered: true,
				requiresFollowUp: false,
			})
		).toBe("none");
	});

	it("names each source on its own", () => {
		expect(decide({ escalationTriggered: true })).toBe("escalation");
		expect(decide({ classifierFlagged: true })).toBe("ai");
		expect(decide({ confirmationState: "gave_up" })).toBe("gave_up");
	});

	it("escalation first, then the classifier, then gave_up", () => {
		expect(
			decide({
				classifierFlagged: true,
				confirmationState: "gave_up",
				escalationTriggered: true,
			})
		).toBe("escalation");
		expect(
			decide({ classifierFlagged: true, confirmationState: "gave_up" })
		).toBe("ai");
	});

	it("a stored flag with no other trace is the classifier's", () => {
		expect(decide({})).toBe("ai");
	});
});
