import { describe, expect, it } from "vitest";
import { matchExercise, type MatchInput } from "./match";

const base: MatchInput = {
  primaryEmotion: "sadness",
  intensity: 5,
  userLanguageTags: [],
  entryType: "open_prompt",
  confirmationState: "confirmed",
};

describe("matchExercise", () => {
  it("defaults to let_it_land for sadness at moderate intensity", () => {
    const [first] = matchExercise(base);
    expect(first).toBe("let_it_land");
  });

  it("routes high intensity (>=8) to reset", () => {
    const [first] = matchExercise({ ...base, intensity: 8 });
    expect(first).toBe("reset");
  });

  it("routes anxiety emotion to reset regardless of intensity", () => {
    const [first] = matchExercise({ ...base, primaryEmotion: "anxiety", intensity: 4 });
    expect(first).toBe("reset");
  });

  it("routes numbness emotion to find_your_edges", () => {
    const [first] = matchExercise({ ...base, primaryEmotion: "numbness" });
    expect(first).toBe("find_your_edges");
  });

  it("routes numb language tags to find_your_edges", () => {
    const [first] = matchExercise({ ...base, userLanguageTags: ["empty", "blank"] });
    expect(first).toBe("find_your_edges");
  });

  it("routes helplessness emotion to make_room", () => {
    const [first] = matchExercise({ ...base, primaryEmotion: "helplessness" });
    expect(first).toBe("make_room");
  });

  it("reads free-text granular labels through the emotion aliases (#536)", () => {
    expect(matchExercise({ ...base, primaryEmotion: "confusion", granularLabel: "worried", intensity: 4 })[0]).toBe("reset");
    // The original word still counts, not just the root it maps to.
    expect(matchExercise({ ...base, primaryEmotion: "confusion", granularLabel: "despair" })[0]).toBe("make_room");
  });

  it("routes stuck language tags to make_room", () => {
    const [first] = matchExercise({ ...base, userLanguageTags: ["stuck", "trapped"] });
    expect(first).toBe("make_room");
  });

  it("routes shame emotion to soften_toward_it", () => {
    const [first] = matchExercise({ ...base, primaryEmotion: "shame" });
    expect(first).toBe("soften_toward_it");
  });

  it("routes worthless language tag to soften_toward_it", () => {
    const [first] = matchExercise({ ...base, userLanguageTags: ["worthless", "not enough"] });
    expect(first).toBe("soften_toward_it");
  });

  it("routes anger emotion to speak_to_it", () => {
    const [first] = matchExercise({ ...base, primaryEmotion: "anger" });
    expect(first).toBe("speak_to_it");
  });

  it("routes rage language tag to speak_to_it", () => {
    const [first] = matchExercise({ ...base, userLanguageTags: ["rage", "betrayal"] });
    expect(first).toBe("speak_to_it");
  });

  it("routes gave_up state to reset first", () => {
    const [first] = matchExercise({ ...base, confirmationState: "gave_up" });
    expect(first).toBe("reset");
  });

  it("routes abandoned state to reset first", () => {
    const [first] = matchExercise({ ...base, confirmationState: "abandoned" });
    expect(first).toBe("reset");
  });

  it("always returns all 6 exercises in ranked list", () => {
    const result = matchExercise(base);
    expect(result).toHaveLength(6);
    const all = ["let_it_land", "find_your_edges", "make_room", "speak_to_it", "soften_toward_it", "reset"];
    expect(result.sort()).toEqual(all.sort());
  });
});
