import { describe, expect, it } from "vitest";
import { evaluateSafeguard, resolveSupportNeed } from "./safeguard";
import type { ClassificationResult } from "./providers/anthropic";
import {
  MODERATION_UNAVAILABLE,
  type ModerationResult,
} from "./providers/moderation";

const classification = (
  overrides: Partial<ClassificationResult> = {},
): ClassificationResult => ({
  primaryEmotion: "sadness",
  primaryEmotionConfidence: 0.8,
  intensity: 5,
  specificity: 5,
  thematicTags: [],
  userLanguageTags: [],
  requiresFollowUp: false,
  supportNeed: "none",
  ...overrides,
});

const moderation = (
  categoryScores: Record<string, number> = {},
): ModerationResult => ({
  ...MODERATION_UNAVAILABLE,
  categoryScores,
});

describe("evaluateSafeguard consequence flags", () => {
  it("none: all flags off", () => {
    const result = evaluateSafeguard(classification(), moderation(), []);
    expect(result.level).toBe("none");
    expect(result.isEscalation).toBe(false);
    expect(result.riskFlag).toBe(false);
    expect(result.isCrisis).toBe(false);
  });

  it("gentle (no trigger type): all flags off", () => {
    const result = evaluateSafeguard(
      classification({ primaryEmotion: "grief", intensity: 7 }),
      moderation(),
      [],
    );
    expect(result.level).toBe("gentle");
    expect(result.isEscalation).toBe(false);
    expect(result.riskFlag).toBe(false);
    expect(result.isCrisis).toBe(false);
  });

  it("crisis via explicit self-harm intent: escalation + risk + crisis", () => {
    const result = evaluateSafeguard(
      classification(),
      moderation({ "self-harm/intent": 0.9 }),
      [],
    );
    expect(result.level).toBe("crisis");
    expect(result.triggerType).toBe("explicit_crisis_language");
    expect(result.isEscalation).toBe(true);
    expect(result.riskFlag).toBe(true);
    expect(result.isCrisis).toBe(true);
  });

  it("elevated via moderate self-harm signal: escalation + risk, no crisis", () => {
    const result = evaluateSafeguard(
      classification(),
      moderation({ "self-harm": 0.4 }),
      [],
    );
    expect(result.level).toBe("elevated");
    expect(result.triggerType).toBe("implicit_risk_language");
    expect(result.isEscalation).toBe(true);
    expect(result.riskFlag).toBe(true);
    expect(result.isCrisis).toBe(false);
  });

  it("elevated via pattern_escalation: escalation yes, riskFlag NO (anti self-reinforcement)", () => {
    const now = Date.now();
    const riskEntry = {
      primaryEmotion: "despair",
      intensity: 8,
      riskFlag: true,
      createdAt: now - 60_000,
    };
    const result = evaluateSafeguard(
      classification({ primaryEmotion: "despair", intensity: 6 }),
      moderation(),
      [riskEntry, riskEntry, riskEntry],
    );
    expect(result.level).toBe("elevated");
    expect(result.triggerType).toBe("pattern_escalation");
    expect(result.isEscalation).toBe(true);
    expect(result.riskFlag).toBe(false);
    expect(result.isCrisis).toBe(false);
  });
});

describe("resolveSupportNeed", () => {
  it("passes the classifier's grade through at safeguard level none", () => {
    expect(resolveSupportNeed("active", "none")).toBe("active");
    expect(resolveSupportNeed("light", "none")).toBe("light");
    expect(resolveSupportNeed("none", "none")).toBe("none");
  });

  it("passes the classifier's grade through at gentle", () => {
    expect(resolveSupportNeed("active", "gentle")).toBe("active");
  });

  it("forces none at elevated regardless of the classifier's grade", () => {
    expect(resolveSupportNeed("active", "elevated")).toBe("none");
    expect(resolveSupportNeed("light", "elevated")).toBe("none");
  });

  it("forces none at crisis regardless of the classifier's grade", () => {
    expect(resolveSupportNeed("active", "crisis")).toBe("none");
  });
});
