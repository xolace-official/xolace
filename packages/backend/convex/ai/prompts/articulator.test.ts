import { describe, expect, it } from "vitest";
import { buildArticulatorPrompt } from "./articulator";

/**
 * word_cloud became reach-eligible on 2026-09-04 (routing.ts, §3.5), so the
 * texture-words block now co-occurs with reaching/holding. Its "complete
 * emotional picture" sentence contradicts both and must drop out; the other
 * two sentences are guards the faint path still needs.
 */
const COMPLETE_PICTURE = "complete emotional picture";
const THEIR_LANGUAGE = "These ARE their language";
const NO_ADDING = "Do not add emotions not implied by the words";

const build = (claimStrength?: "reaching" | "holding" | "measured") =>
  buildArticulatorPrompt({
    rawInput: "heavy, tight, blank",
    classification: {
      primaryEmotion: "numbness",
      primaryEmotionConfidence: 0.6,
      intensity: 5,
      specificity: 2,
      thematicTags: [],
      userLanguageTags: ["heavy", "tight", "blank"],
      requiresFollowUp: false,
      supportNeed: "none",
    },
    patternSummary: "(none)",
    safeguardLevel: "none",
    mirrorTone: "adaptive",
    isFirstSession: false,
    recentMirrors: [],
    entryType: "word_cloud",
    claimStrength,
  }).system;

describe("articulator — word_cloud entry-type block", () => {
  it("asks for a complete picture on the normal path", () => {
    const system = build("measured");
    expect(system).toContain(COMPLETE_PICTURE);
    expect(system).toContain(THEIR_LANGUAGE);
    expect(system).toContain(NO_ADDING);
  });

  it("drops only the complete-picture sentence when faint", () => {
    for (const claimStrength of ["reaching", "holding"] as const) {
      const system = build(claimStrength);
      expect(system).not.toContain(COMPLETE_PICTURE);
      expect(system).toContain(THEIR_LANGUAGE);
      expect(system).toContain(NO_ADDING);
    }
  });
});

// ADR-0014: intake-signal instructions handed to the model, never a coded
// corroboration gate.
const buildWithIntake = (
  intakeSignals: Parameters<typeof buildArticulatorPrompt>[0]["intakeSignals"]
) =>
  buildArticulatorPrompt({
    rawInput: "just tired today",
    classification: {
      primaryEmotion: "fatigue",
      primaryEmotionConfidence: 0.6,
      intensity: 4,
      specificity: 3,
      thematicTags: [],
      userLanguageTags: ["tired"],
      requiresFollowUp: false,
      supportNeed: "none",
    },
    patternSummary: "(none)",
    safeguardLevel: "none",
    mirrorTone: "adaptive",
    isFirstSession: true,
    recentMirrors: [],
    entryType: "open_prompt",
    intakeSignals,
  }).system;

describe("articulator — intake signal instructions (ADR-0014)", () => {
  it("emits no intake block when intakeSignals is null", () => {
    const system = buildWithIntake(null);
    expect(system).not.toContain("Intake Signal");
  });

  it("references disclosureStyle when only that axis is present", () => {
    const system = buildWithIntake({ disclosureStyle: "keep_it_brief" });
    expect(system).toContain("Intake Signal");
    expect(system).toContain("keep things brief");
    expect(system).not.toContain("struggle to find the words");
  });

  it("references emotionAwareness when only that axis is present", () => {
    const system = buildWithIntake({
      disclosureStyle: "depends",
      emotionAwareness: "numb_or_cant_tell",
    });
    expect(system).toContain("often feel numb");
  });

  it("includes both axes and the corroboration instruction when both fire", () => {
    const system = buildWithIntake({
      disclosureStyle: "keep_it_brief",
      emotionAwareness: "know_but_no_words",
    });
    expect(system).toContain("keep things brief");
    expect(system).toContain("struggle to find the words");
    expect(system).toContain("Only let the intake claim shape your mirror");
    expect(system).toContain("Never mention intake");
  });
});
