import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { buildPathsPrompt, parsePathsResponse } from "./prompt";

const WHY = "You said the mornings are the hardest, so this is one slow minute before the day starts.";

const entry = (actionType: string, order: number, why = WHY) => ({
  actionType,
  order,
  why,
});

describe("parsePathsResponse", () => {
  it("keeps valid twigs and renumbers order from 1", () => {
    const { twigs, dropped } = parsePathsResponse(
      JSON.stringify([entry("breathing", 2), entry("music_topic_calm_peace", 1)]),
      CATALOG,
    );
    expect(dropped).toEqual([]);
    expect(twigs.map((t) => [t.actionType, t.order])).toEqual([
      ["music_topic_calm_peace", 1],
      ["breathing", 2],
    ]);
  });

  it("tolerates code fences and prose around the array", () => {
    const raw = "Here you go:\n```json\n" + JSON.stringify([entry("breathing", 1), entry("audio_topic_grief", 2)]) + "\n```";
    expect(parsePathsResponse(raw, CATALOG).twigs).toHaveLength(2);
  });

  it("drops an unknown actionType with a reason", () => {
    const { twigs, dropped } = parsePathsResponse(
      JSON.stringify([entry("breathing", 1), entry("audio_topic_nope", 2)]),
      CATALOG,
    );
    expect(twigs).toHaveLength(1);
    expect(dropped).toEqual([{ actionType: "audio_topic_nope", reason: "unknown_action_type" }]);
  });

  it("drops a duplicate actionType", () => {
    const { twigs, dropped } = parsePathsResponse(
      JSON.stringify([entry("breathing", 1), entry("breathing", 2)]),
      CATALOG,
    );
    expect(twigs).toHaveLength(1);
    expect(dropped[0].reason).toBe("duplicate_action_type");
  });

  it("drops a why in the clinical register", () => {
    const { dropped } = parsePathsResponse(
      JSON.stringify([
        entry("breathing", 1, "You mentioned your anxiety symptoms, so this helps you regulate and cope for a minute."),
      ]),
      CATALOG,
    );
    expect(dropped[0].reason).toBe("why_vocabulary");
  });

  it.each([
    "You said the mornings are hardest, and this one slow minute will help before the day starts.",
    "You said the mornings are hardest, so take one slow minute and you'll feel calmer after.",
    "You said the mornings are hardest, so here is one slow minute you will feel better for.",
    "You said the mornings are hardest, so this is one slow minute proven to settle a rough start.",
    "You said the mornings are hardest, so this is one slow minute guaranteed to soften the start.",
  ])("drops a why that promises an outcome: %s", (why) => {
    const { dropped } = parsePathsResponse(JSON.stringify([entry("breathing", 1, why)]), CATALOG);
    expect(dropped[0].reason).toBe("why_promise");
  });

  it("keeps a why that quotes the person's own feeling", () => {
    const { dropped } = parsePathsResponse(
      JSON.stringify([entry("breathing", 1, "You said you feel heaviest in the mornings, so this is one slow minute before the day.")]),
      CATALOG,
    );
    expect(dropped).toEqual([]);
  });

  it("drops a why that is too short or too long", () => {
    const short = "Breathe now.";
    const long = Array.from({ length: 40 }, () => "word").join(" ") + ".";
    const { dropped } = parsePathsResponse(
      JSON.stringify([entry("breathing", 1, short), entry("music_topic_calm_peace", 2, long)]),
      CATALOG,
    );
    expect(dropped.map((d) => d.reason)).toEqual(["why_length", "why_length"]);
  });

  // Prod no-ship 2026-09-19: a 25-word bridge why was dropped against a
  // 24-word cap, leaving 1 twig < MIN_TWIGS. The validator needs slack past
  // the prompt's "roughly 12–22".
  it("keeps a why that overshoots the prompt's rough range by a few words", () => {
    const why =
      "You said the people are slipping away for a dream you are not sure about, so this is a message to someone who still knows you well.";
    expect(why.split(/\s+/).length).toBe(27);
    const { dropped } = parsePathsResponse(JSON.stringify([entry("bridge", 1, why)]), CATALOG);
    expect(dropped).toEqual([]);
  });

  it("drops a why that is more than one sentence", () => {
    const { dropped } = parsePathsResponse(
      JSON.stringify([entry("breathing", 1, "You said the mornings are hardest. This is one slow minute before the day starts.")]),
      CATALOG,
    );
    expect(dropped[0].reason).toBe("why_sentences");
  });

  it("keeps at most four twigs", () => {
    const { twigs, dropped } = parsePathsResponse(
      JSON.stringify([
        entry("breathing", 1),
        entry("music_topic_calm_peace", 2),
        entry("audio_topic_grief", 3),
        entry("audio_topic_anxiety_relief", 4),
        entry("xolacer", 5),
      ]),
      CATALOG,
    );
    expect(twigs).toHaveLength(4);
    expect(dropped[0].reason).toBe("over_max");
  });

  it("returns everything dropped when the payload is not an array", () => {
    const { twigs, dropped } = parsePathsResponse("not json at all", CATALOG);
    expect(twigs).toEqual([]);
    expect(dropped).toEqual([{ actionType: null, reason: "unparseable" }]);
  });
});

describe("buildPathsPrompt", () => {
  const base = {
    understanding: {
      primaryEmotion: "sadness",
      granularLabel: "heavy",
      intensity: 6,
      specificity: 7,
      thematicTags: ["work"],
      userLanguageTags: ["stretched thin"],
      temporalContext: "present_focused",
      supportNeed: "light" as const,
      safeguardLevel: "none",
    },
    profile: null,
    catalog: CATALOG,
    tier: "plus" as const,
  };

  it("proceeds on a cold start with a null profile", () => {
    const { user } = buildPathsPrompt(base);
    expect(user).toContain("(none yet");
    expect(user).toContain("stretched thin");
  });

  it("lists only the catalog it was given", () => {
    const { user } = buildPathsPrompt({ ...base, catalog: CATALOG.filter((c) => c.actionType !== "xolacer") });
    expect(user).not.toContain("xolacer");
    expect(user).toContain("breathing");
  });

  it("carries negative examples only", () => {
    const { system } = buildPathsPrompt(base);
    expect(system).toMatch(/do not/i);
    expect(system).not.toMatch(/good example|for example, write/i);
  });

  // #521: context only for compounding domains tonight touched — the gate is
  // upstream; here, one line when given, none when not.
  it("adds one compounding line, roughly dated, only when given", () => {
    expect(buildPathsPrompt(base).user).not.toContain("weighing on them");
    const { user } = buildPathsPrompt({
      ...base,
      compounding: [
        { domain: "work", state: "easing", returning: false, days: 20 },
        { domain: "health", state: "compounding", returning: true, days: 3 },
      ],
    });
    const lines = user.split("\n").filter((l) => l.includes("weighing on them"));
    expect(lines).toEqual([
      "- weighing on them lately: work for about 3 weeks, easing; health for a few days, returning",
    ]);
  });
});

describe("the why line never carries compounding (#521)", () => {
  it.each([
    "You said work has been heavier than your usual, so this is one slow minute before the day.",
    "You said work keeps compounding lately, so this is one slow minute before the day starts.",
    "You said work has weighed on you for three weeks, so this is one slow minute before the day.",
    "You said work has been heavy for 20 days, so this is one slow minute before the day starts.",
  ])("drops %s", (why) => {
    const { dropped } = parsePathsResponse(JSON.stringify([entry("breathing", 1, why)]), CATALOG);
    expect(dropped[0].reason).toBe("why_vocabulary");
  });
});
