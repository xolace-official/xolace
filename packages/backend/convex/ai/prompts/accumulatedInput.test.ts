import { describe, expect, it } from "vitest";
import { buildAccumulatedInput } from "./accumulatedInput";

describe("buildAccumulatedInput", () => {
  it("returns the raw input unchanged when no turn added text", () => {
    expect(
      buildAccumulatedInput("i feel off", [
        { turnNumber: 1, userFeedback: "not_quite" },
        { turnNumber: 2, userFeedback: "not_quite", userInput: "   " },
      ]),
    ).toBe("i feel off");
  });

  it("marks each turn's text and keeps them in turn order", () => {
    const out = buildAccumulatedInput("i feel off", [
      { turnNumber: 2, userFeedback: "say_more", userInput: "it's my brother" },
      { turnNumber: 1, userFeedback: "not_quite", userInput: "not angry" },
    ]);

    expect(out).toBe(
      '[Original]\ni feel off\n\n[After "not quite" — free text]\nnot angry\n\n[After "say more" — free text]\nit\'s my brother',
    );
  });
});
