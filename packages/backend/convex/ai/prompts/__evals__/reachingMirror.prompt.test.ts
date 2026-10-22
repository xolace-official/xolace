/**
 * Prompt test for the reach paths — NOT an eval. Plain Vitest, no key gate,
 * no model call, milliseconds. Run: `bun run test convex/ai/prompts/__evals__`.
 *
 * The failure defended against (doc §9.5) is SUBTRACTION REVERSION: one of
 * §4.3's subtractions gets edited back at its site and the mirror silently
 * resumes spending memory as understanding. That is a change to the prompt,
 * not to model behaviour — obedience was established empirically over 5 rounds
 * (#171) — so a string assertion locks the finding in where a judge would
 * re-purchase it every run.
 *
 * Assertion strategy, deliberately split:
 *  - PRESENCE (a subtraction must be there) asserts the FULL text, so a
 *    partial deletion fails.
 *  - ABSENCE (a standing instruction must be gone) asserts the SHORTEST
 *    distinctive fragment, because an absence assertion on a long sentence
 *    passes silently the moment someone rewords one word in the middle.
 *
 * Accepted cost: an innocuous reword of a subtraction fails this test. That is
 * correct — these texts were established empirically and a reword is an
 * unvalidated change.
 *
 * Accepted limit: a string test cannot catch the model ceasing to obey text
 * that is still present. §9.3's fixed-n review is the instrument for that.
 */
import { describe, expect, it } from "vitest";
import { buildArticulatorPrompt, hasMetaNarration } from "../articulator";
import type { ClaimStrength } from "../../routing";
import type { ClassificationResult } from "../../providers/anthropic";

// --- Fixtures ---------------------------------------------------------

const classification: ClassificationResult = {
  primaryEmotion: "sadness",
  primaryEmotionConfidence: 0.4,
  intensity: 8,
  specificity: 2,
  thematicTags: [],
  userLanguageTags: ["heavy"],
  requiresFollowUp: false,
  supportNeed: "none",
};

/**
 * Memory is present on purpose: subtraction 4 lives inside the episodic block,
 * so without `episodicRecall` its site is never rendered and the assertion
 * would pass against a prompt that had deleted it.
 */
const build = (
  claimStrength?: ClaimStrength,
  overrides: {
    userFeedback?: string;
    intensity?: number;
    specificity?: number;
    /** Cold start passes `null` / `[]`: the memory headings then never render. */
    semanticProfile?: string | null;
    episodicRecall?: string[];
  } = {},
) =>
  buildArticulatorPrompt({
    rawInput: "feeling heavy tonight",
    classification: {
      ...classification,
      intensity: overrides.intensity ?? classification.intensity,
      specificity: overrides.specificity ?? classification.specificity,
    },
    patternSummary: "carries weight quietly",
    safeguardLevel: "none",
    mirrorTone: "adaptive",
    claimStrength,
    isFirstSession: false,
    recentMirrors: [],
    semanticProfile:
      overrides.semanticProfile === undefined
        ? "They tend to arrive without words for it."
        : overrides.semanticProfile,
    episodicRecall: overrides.episodicRecall ?? ["they wrote about work"],
    existingMirror: overrides.userFeedback ? "a previous mirror" : undefined,
    userFeedback: overrides.userFeedback,
  }).system;

// --- Presence: full text (doc §4.1, §4.2, §4.3) -----------------------

/**
 * #216's load-bearing sentence, pulled out because the cold-start fixture
 * asserts it on its own. Interpolated into the block below rather than typed
 * twice: two copies of a text this long drift, and the drift would pass.
 */
const CLOSING_QUESTION_INSTRUCTION = `The closing question is the only place you may reach past tonight's words, and the only thing it may reach into is a section titled "What You Know About This Person". If that section is in your context, the question names one specific thing drawn from it. If that section is not in your context, the question proposes nothing at all, not specific.`;

const REACHING_BLOCK = `## Claim Strength: Reaching
There is not enough here to build a full mirror. Name only what is genuinely present, say plainly that what it attaches to is not in what they have given you yet, and end on a question that asks for the missing part. Locate the shortfall in the words on the page, not in them and not in you.
- The last character of the mirror is a question mark. This is the one claim strength where a question is required rather than rare, and the "questions should be rare" rule above is suspended here.
- The question sits in the same paragraph as the rest, immediately after the shortfall. NEVER put it on its own line, and NEVER use a line break anywhere in the mirror.
- ${CLOSING_QUESTION_INSTRUCTION}
- NEVER found the question on a past moment. Retrieved moments stay recognition only and may not supply anything the question proposes.
- NEVER let anything but the question reach past tonight's words. What you name, and the shortfall you state, come from tonight's words alone.
- NEVER drop the shortfall. The question follows it; it does not replace it.
- NEVER guess at what is missing anywhere but in the question, and never offer alternatives or an "or" anywhere, the question included.
- NEVER ask more than one question.
- NEVER make a general claim about how this kind of feeling works for people.
- NEVER imply they are unclear, avoidant, or withholding.
- NEVER apologise for the gap or explain why it is there.`;

const HOLDING_BLOCK = `## Claim Strength: Holding
The reaching is over. Name what is actually present, flatly, and end on it. The feeling has arrived without anything attached to it, and how it is arriving is itself part of what is true tonight. Name the arriving. Do not characterise what is or is not behind it.
- NEVER ask a question, and never invite them to add more.
- NEVER say that something has not come through, is not here yet, or is not in what they have given you. That was the previous mirror's move; saying it twice reads as being stuck.
- NEVER assert that there is nothing underneath it or no reason for it. You do not know that.
- NEVER hedge or hold the claim loosely. What you name, you name flatly.
- NEVER guess at a cause, a source, or a shape the words have not taken.
- NEVER apologise, and never mark this as partial or incomplete.`;

const SUBTRACTION_1 =
  "Weave the user's own emotionally charged words into your mirror. Do not add a dimension they did not give you; at this signal strength an expansion is a guess wearing the clothes of insight.";
const SUBTRACTION_2 =
  "The signal is faint. Do not give it a form it has not taken.";
const SUBTRACTION_3 =
  "let it inform your ear only; it may not supply anything tonight's words did not";
const SUBTRACTION_4 = `You remember this person, and that may show. Recognition and understanding are separate claims and you have earned only the first. You may recognise that they are here again, or the manner in which they arrive, and nothing more. Nothing from a past moment may cross into tonight as explanation.
- Never use a past moment to say what tonight is about, however well it fits`;

// --- Absence: shortest distinctive fragment ----------------------------

const EXPANSION_MANDATE = "add a dimension they didn't have words for";
/** All four Intensity × Specificity branches (§4.3 subtraction 2). */
const IS_BRANCHES = [
  "meet them at full depth",
  "Give the vague enormity a form",
  "Match their measured tone",
  "light and curious",
];
const PATTERN_MANDATE = "let it actively shape what you notice";
const EPISODIC_MANDATE = "you may acknowledge that quietly";
const DELETED_BLOCK = "## Claim Strength: Tentative";
/** #216: the reach now closes on a question; the old ban must be gone. */
const OLD_QUESTION_BAN = "The gap is stated, never posed.";
const REFINEMENT_PUSH =
  "Try a different angle, different metaphor, different emotional read.";

describe("reaching path", () => {
  const system = build("reaching");

  it("carries the Reaching block verbatim", () => {
    expect(system).toContain(REACHING_BLOCK);
  });

  it("carries subtractions 1-4 in full", () => {
    expect(system).toContain(SUBTRACTION_1);
    expect(system).toContain(SUBTRACTION_2);
    expect(system).toContain(SUBTRACTION_3);
    expect(system).toContain(SUBTRACTION_4);
  });

  it("keeps the semantic-profile block (deliberately not subtracted)", () => {
    expect(system).toContain("## What You Know About This Person");
  });

  /**
   * #216. The reach reverses "declarative, never interrogative" (doc §1, §4.1)
   * for this block alone. The instruction text is identical either way — the
   * model conditions on whether the profile section is in its own context, so
   * both fixtures must carry it — while the cold-start assertion is what makes
   * "absent, not present-but-empty" a checked fact rather than an assumption.
   */
  it("closes on a question, cold start and memory-present alike", () => {
    const coldStart = build("reaching", {
      semanticProfile: null,
      episodicRecall: [],
    });
    for (const prompt of [system, coldStart]) {
      expect(prompt).toContain(CLOSING_QUESTION_INSTRUCTION);
      expect(prompt).not.toContain(OLD_QUESTION_BAN);
    }
    expect(coldStart).not.toContain("## What You Know About This Person");
  });

  it("has none of the three standing instructions that fill the gap", () => {
    expect(system).not.toContain(EXPANSION_MANDATE);
    for (const branch of IS_BRANCHES) expect(system).not.toContain(branch);
    expect(system).not.toContain(PATTERN_MANDATE);
    expect(system).not.toContain(EPISODIC_MANDATE);
  });

  it("does not resurrect the deleted Tentative block", () => {
    expect(system).not.toContain(DELETED_BLOCK);
  });
});

describe("holding path", () => {
  const system = build("holding");

  it("carries the Holding block verbatim, third NEVER included", () => {
    expect(system).toContain(HOLDING_BLOCK);
    expect(system).toContain(
      "NEVER assert that there is nothing underneath it or no reason for it.",
    );
  });

  it("carries subtractions 1-4 unchanged", () => {
    expect(system).toContain(SUBTRACTION_1);
    expect(system).toContain(SUBTRACTION_2);
    expect(system).toContain(SUBTRACTION_3);
    expect(system).toContain(SUBTRACTION_4);
  });

  it("never reaches again — the Reaching block is not also present", () => {
    expect(system).not.toContain("## Claim Strength: Reaching");
  });

  it("replaces the refinement pushes with subtraction 5", () => {
    const notQuite = build("holding", { userFeedback: "not_quite" });
    expect(notQuite).toContain(
      "Change what you name, not how much you claim. A different angle on the same faint signal is still the same faint signal.",
    );
    expect(notQuite).not.toContain(REFINEMENT_PUSH);

    const sayMore = build("holding", { userFeedback: "say_more" });
    expect(sayMore).toContain(
      "The user added more words. They did not add more signal. Use anything genuinely new; do not treat the added length as permission to claim more than before.",
    );
  });
});

/**
 * LOAD-BEARING (§9.5). Without this block, deleting the standing instructions
 * globally would still pass every absence assertion above.
 */
describe("control: the standing instructions are still there off the reach paths", () => {
  for (const strength of [undefined, "measured", "confident"] as const) {
    const label = strength ?? "unset";

    it(`${label}: keeps the expansion mandate and the memory mandates`, () => {
      const system = build(strength);
      expect(system).toContain(EXPANSION_MANDATE);
      expect(system).toContain(PATTERN_MANDATE);
      expect(system).toContain(EPISODIC_MANDATE);
      expect(system).not.toContain(SUBTRACTION_2);
    });
  }

  it("keeps all four Intensity × Specificity branches reachable", () => {
    const bands: [number, number, string][] = [
      [8, 8, IS_BRANCHES[0]],
      [8, 2, IS_BRANCHES[1]],
      [2, 8, IS_BRANCHES[2]],
      [2, 2, IS_BRANCHES[3]],
    ];
    for (const [intensity, specificity, branch] of bands) {
      expect(build("measured", { intensity, specificity })).toContain(branch);
    }
  });
});

/**
 * A rejected prototype arm emitted "Wait, let me redo that without the banned
 * construction." straight into the mirror. Both ingredients are live in
 * production, so the pipeline falls back rather than deliver one.
 */
describe("meta-narration never reaches mirrorText", () => {
  it("catches the false-start prefix and the instruction vocabulary", () => {
    expect(
      hasMetaNarration("Wait, let me redo that without the banned construction."),
    ).toBe(true);
    expect(hasMetaNarration("Let me try that again.")).toBe(true);
    expect(hasMetaNarration("Actually, that was the wrong read.")).toBe(true);
    expect(hasMetaNarration("Following the instructions above: you are tired.")).toBe(true);
  });

  it("sees through a leading audio tag", () => {
    expect(
      hasMetaNarration("[thoughtful] Wait, let me redo that."),
    ).toBe(true);
  });

  it("leaves a real mirror alone", () => {
    // The mirror weaves the user's own words back in, so the rule vocabulary
    // shows up in ordinary entries and must not cost them their mirror.
    expect(
      hasMetaNarration("Getting banned from that group chat took something."),
    ).toBe(false);
    expect(
      hasMetaNarration("You keep following his instructions and losing yourself."),
    ).toBe(false);
    expect(
      hasMetaNarration("You read the instructions twice and still felt stupid."),
    ).toBe(false);
    expect(
      hasMetaNarration(
        "That heaviness is sitting right there, but what it's resting on isn't in what you've given me yet.",
      ),
    ).toBe(false);
    // "Waiting" is not "Wait" — the prefix is anchored and word-shaped.
    expect(hasMetaNarration("Waiting is its own kind of weight tonight.")).toBe(
      false,
    );
  });
});
