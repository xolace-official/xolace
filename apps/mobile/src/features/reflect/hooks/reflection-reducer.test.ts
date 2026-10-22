import { describe, expect, it } from "vitest";
import { initialState, reducer } from "@/src/features/reflect/hooks/reflection-reducer";

/** Draft retention (#258): only an explicit act throws the writing away. */
describe("reducer — draft retention", () => {
  const withDraft = { ...initialState, screen: "typing" as const, entryText: "I keep" };

  it("keeps the entry text when the composer is dismissed", () => {
    const next = reducer(withDraft, { type: "DISMISS_TYPING" });
    expect(next.screen).toBe("idle");
    expect(next.entryText).toBe("I keep");
  });

  it("clears the entry text on an explicit discard", () => {
    expect(reducer(withDraft, { type: "DISCARD_DRAFT" }).entryText).toBe("");
  });

  it("still clears the entry text on RESET", () => {
    expect(reducer(withDraft, { type: "RESET" }).entryText).toBe("");
  });
});
