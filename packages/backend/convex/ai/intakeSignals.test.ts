import { describe, expect, it } from "vitest";
import { shapeIntakeSignals } from "./intakeSignals";

// ADR-0014: the only place the "prefer_not_to_say" omission rule lives.
// buildSessionContext itself stays untested here, same as today — the
// decision logic is entirely in this pure function.
describe("shapeIntakeSignals", () => {
  it("returns null when there is no intake_responses row", () => {
    expect(shapeIntakeSignals(null)).toBeNull();
  });

  it("passes both fields through when populated", () => {
    expect(
      shapeIntakeSignals({
        disclosureStyle: "bit_at_a_time",
        emotionAwareness: "something_off_unclear",
      })
    ).toEqual({
      disclosureStyle: "bit_at_a_time",
      emotionAwareness: "something_off_unclear",
    });
  });

  it("drops emotionAwareness when it's prefer_not_to_say, not as a placeholder", () => {
    const result = shapeIntakeSignals({
      disclosureStyle: "all_at_once",
      emotionAwareness: "prefer_not_to_say",
    });
    expect(result).toEqual({ disclosureStyle: "all_at_once" });
    expect(result).not.toHaveProperty("emotionAwareness");
  });
});
