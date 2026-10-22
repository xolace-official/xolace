import { describe, expect, it } from "vitest";
import {
  abandonRequiresFollowUp,
  computeRequiresFollowUp,
  followUpCadence,
  followUpTier,
  minReturnGapForTier,
  shouldEmitReturn,
  shouldSupersede,
} from "./followUpCadence";

describe("followUpTier", () => {
  it("maps safeguard crisis to acute (overrides everything)", () => {
    expect(
      followUpTier({ safeguardLevel: "crisis", intensity: 2 }),
    ).toBe("acute");
  });

  it("maps safeguard elevated to elevated", () => {
    expect(followUpTier({ safeguardLevel: "elevated", intensity: 3 })).toBe(
      "elevated",
    );
  });

  it("maps grief at intensity >= 7 to elevated", () => {
    expect(
      followUpTier({ primaryEmotion: "grief", intensity: 8 }),
    ).toBe("elevated");
  });

  it("maps shame granularLabel at intensity >= 7 to elevated", () => {
    expect(
      followUpTier({
        primaryEmotion: "anger",
        granularLabel: "shame",
        intensity: 7,
      }),
    ).toBe("elevated");
  });

  it("reads free-text granular labels through the emotion aliases (#536)", () => {
    expect(followUpTier({ primaryEmotion: "confusion", granularLabel: "sorrow", intensity: 8 })).toBe("elevated");
    expect(followUpTier({ primaryEmotion: "confusion", granularLabel: "Ashamed", intensity: 7 })).toBe("elevated");
  });

  it("keeps grief BELOW intensity 7 as standard", () => {
    expect(followUpTier({ primaryEmotion: "grief", intensity: 6 })).toBe(
      "standard",
    );
  });

  it("maps gave_up to elevated regardless of intensity", () => {
    expect(
      followUpTier({ confirmationState: "gave_up", intensity: 2 }),
    ).toBe("elevated");
  });

  it("falls through to standard for a plain classifier flag", () => {
    expect(
      followUpTier({ primaryEmotion: "anxiety", intensity: 5 }),
    ).toBe("standard");
  });

  it("treats gentle/none safeguard as non-acute", () => {
    expect(followUpTier({ safeguardLevel: "gentle", intensity: 5 })).toBe(
      "standard",
    );
    expect(followUpTier({ safeguardLevel: "none", intensity: 5 })).toBe(
      "standard",
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
    const c = followUpCadence({ primaryEmotion: "anxiety", intensity: 5 });
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
    expect(
      computeRequiresFollowUp({ confirmationState: "gave_up" }),
    ).toBe(true);
  });

  it("true when escalationTriggered (belt and braces)", () => {
    expect(computeRequiresFollowUp({ escalationTriggered: true })).toBe(true);
  });

  it("false when nothing qualifies", () => {
    expect(
      computeRequiresFollowUp({
        storedFlag: false,
        confirmationState: "confirmed",
        escalationTriggered: false,
      }),
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
        cardStatus: "pending",
        cardCreatedAt: created,
        now: created + gap - 1,
        minGapMs: gap,
      }),
    ).toBe(false);
  });

  it("emits once the gap has elapsed on a pending card", () => {
    expect(
      shouldEmitReturn({
        cardStatus: "pending",
        cardCreatedAt: created,
        now: created + gap,
        minGapMs: gap,
      }),
    ).toBe(true);
  });

  it("never emits for a non-pending card (no re-send after ready)", () => {
    expect(
      shouldEmitReturn({
        cardStatus: "ready",
        cardCreatedAt: created,
        now: created + 10 * gap,
        minGapMs: gap,
      }),
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
