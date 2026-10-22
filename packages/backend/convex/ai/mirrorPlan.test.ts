import { describe, expect, it } from "vitest";
import { decideMirrorOutcome, resolveMirrorTone } from "./mirrorPlan";
import type { SafeguardResult } from "./safeguard";
import type { ClassificationResult } from "./providers/anthropic";

const classification = (
  overrides: Partial<ClassificationResult> = {},
): ClassificationResult => ({
  primaryEmotion: "sadness",
  primaryEmotionConfidence: 0.8,
  intensity: 5,
  specificity: 7,
  thematicTags: [],
  userLanguageTags: [],
  requiresFollowUp: false,
  supportNeed: "none",
  ...overrides,
});

const safeguard = (
  overrides: Partial<SafeguardResult> = {},
): SafeguardResult => ({
  level: "none",
  triggerConfidence: 0,
  triggerEvidence: "",
  actionTaken: "resources_shown",
  resourcesPresented: [],
  shouldReject: false,
  isEscalation: false,
  riskFlag: false,
  isCrisis: false,
  ...overrides,
});

const decide = (input?: Partial<Parameters<typeof decideMirrorOutcome>[0]>) =>
  decideMirrorOutcome({
    rawMirrorTone: undefined,
    isPremium: false,
    classification: classification(),
    safeguard: safeguard(),
    entryType: "open_prompt",
    profileReachedToday: false,
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
    expect(decide({ rawMirrorTone: "witnessed", isPremium: false }).tone).toBe(
      "adaptive",
    );
  });

  it("threads claim strength from routeClaimStrength", () => {
    expect(
      decide({
        classification: classification({
          primaryEmotionConfidence: 0.9,
          specificity: 8,
        }),
      }).claimStrength,
    ).toBe("confident");
  });

  it("reaches on a faint session with no memory connection", () => {
    expect(
      decide({ classification: classification({ specificity: 2 }) })
        .claimStrength,
    ).toBe("reaching");
  });

  it("passes the gate's guards through — escalation and the same-day reach", () => {
    const faint = classification({ specificity: 2 });
    expect(
      decide({
        classification: faint,
        safeguard: safeguard({
          level: "crisis",
          triggerType: "explicit_crisis_language",
          isEscalation: true,
        }),
      }).claimStrength,
    ).toBe("measured");
    expect(
      decide({ classification: faint, profileReachedToday: true })
        .claimStrength,
    ).toBe("measured");
    expect(
      decide({ classification: faint, episodicTopScore: 0.9 }).claimStrength,
    ).toBe("measured");
  });

  it("mirrors the safeguard consequence flags", () => {
    const plan = decide({
      safeguard: safeguard({
        level: "crisis",
        triggerType: "explicit_crisis_language",
        isEscalation: true,
        riskFlag: true,
        isCrisis: true,
      }),
    });
    expect(plan.isEscalation).toBe(true);
    expect(plan.riskFlag).toBe(true);
    expect(plan.isCrisis).toBe(true);
  });

  it("requires follow-up on escalation even when the classifier says no", () => {
    expect(
      decide({ safeguard: safeguard({ isEscalation: true }) }).requiresFollowUp,
    ).toBe(true);
  });

  it("requires follow-up when the classifier asks for it", () => {
    expect(
      decide({ classification: classification({ requiresFollowUp: true }) })
        .requiresFollowUp,
    ).toBe(true);
  });

  it("requires no follow-up otherwise", () => {
    expect(decide().requiresFollowUp).toBe(false);
  });

  it("falls back to reset when classifier confidence is below 0.6", () => {
    expect(
      decide({
        classification: classification({ primaryEmotionConfidence: 0.5 }),
      }).exerciseTitle,
    ).toBe("reset");
  });

  it("uses the top-ranked exercise when confidence is sufficient", () => {
    expect(decide().exerciseTitle).toBe("let_it_land");
  });
});
