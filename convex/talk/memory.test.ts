import { describe, expect, it } from "vitest";
import { recallLine, renderMemory } from "./memory";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 20);

describe("renderMemory", () => {
  it("carries the profile and recent moments, each with its entry type, in plain words", () => {
    const text = renderMemory(
      {
        memoryOn: true,
        profile: "Recurring themes: work pressure",
        moments: [
          {
            createdAt: now - 2 * DAY,
            entryType: "talk",
            primaryEmotion: "anxiety",
            granularLabel: "dread",
            thematicTags: ["work"],
            userLanguageTags: ["drowning"],
            temporalContext: "ongoing",
          },
          {
            createdAt: now - 9 * DAY,
            entryType: "open_prompt",
            primaryEmotion: "sadness",
            thematicTags: [],
            userLanguageTags: [],
          },
        ],
        intake: null,
      },
      now,
    );
    expect(text).toContain("Recurring themes: work pressure");
    expect(text).toContain("2 days ago, a talk with you: dread; about work; their words: drowning; ongoing");
    expect(text).toContain("9 days ago, a written reflection: sadness");
    expect(text).not.toContain("intensity");
  });

  it("gives intake as a hint only when it is there", () => {
    const first = renderMemory(
      { memoryOn: true, profile: null, moments: [], intake: { disclosureStyle: "bit_at_a_time" } },
      now,
    );
    expect(first).toContain("a bit at a time");
    expect(first).not.toContain("feelings");
    expect(first).toContain("Never mention");
  });

  it("knows nothing of them with memory off", () => {
    const off = renderMemory({ memoryOn: false, profile: "Recurring themes: work", moments: [], intake: null }, now);
    expect(off).toContain("memory is off");
    expect(off).not.toContain("Recurring themes");
  });
});

describe("recallLine", () => {
  it("drops the labels line and keeps their words, dated", () => {
    expect(
      recallLine(
        {
          text: "I keep thinking about Dad.\n\nIt sounds like grief.\n\nemotion: sadness | intensity: 7/10",
          createdAt: now - 21 * DAY,
          entryType: "voice",
        },
        now,
      ),
    ).toBe("3 weeks ago, a voice reflection: I keep thinking about Dad.\n\nIt sounds like grief.");
  });

  it("is null for a labels-only memory", () => {
    expect(recallLine({ text: "emotion: fear | intensity: 9/10", createdAt: now, entryType: "talk" }, now)).toBeNull();
  });

  it("caps a long memory", () => {
    const line = recallLine({ text: "a".repeat(5000), createdAt: now, entryType: "talk" }, now);
    expect(line!.length).toBeLessThan(900);
  });
});
