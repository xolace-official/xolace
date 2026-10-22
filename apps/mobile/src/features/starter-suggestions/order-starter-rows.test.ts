import { describe, expect, it } from "vitest";
import { orderStarterRows } from "@/src/features/starter-suggestions/order-starter-rows";
import { STARTER_ROWS } from "@/src/features/starter-suggestions/starter-rows";

const ids = (intake: Parameters<typeof orderStarterRows>[0]) => orderStarterRows(intake).map((r) => r.id);
const DEFAULT = ["reflect", "vent", "lantern", "listen", "xolacer"];

describe("orderStarterRows (ADR-0017)", () => {
  it.each([
    ["understand_feelings", "reflect"],
    ["make_it_regular", "reflect"],
    ["get_through_hard_moment", "vent"],
    ["feel_less_alone", "xolacer"],
    ["just_looking", "listen"],
  ])("intent %s puts %s first, rest in default order", (intent, first) => {
    const out = ids({ intent, emotionAwareness: "know_and_can_say" });
    expect(out).toEqual([first, ...DEFAULT.filter((id) => id !== first)]);
  });

  it.each(["know_but_no_words", "something_off_unclear", "numb_or_cant_tell"])(
    "emotionAwareness %s puts Reflect last, even when intent picks it",
    (emotionAwareness) => {
      expect(ids({ intent: "prefer_not_to_say", emotionAwareness })).toEqual(["vent", "lantern", "listen", "xolacer", "reflect"]);
      expect(ids({ intent: "understand_feelings", emotionAwareness })).toEqual(["vent", "lantern", "listen", "xolacer", "reflect"]);
      expect(ids({ intent: "feel_less_alone", emotionAwareness })).toEqual(["xolacer", "vent", "lantern", "listen", "reflect"]);
    },
  );

  it.each([
    ["missing", null],
    ["loading", undefined],
    ["prefer_not_to_say", { intent: "prefer_not_to_say", emotionAwareness: "prefer_not_to_say" }],
    ["unknown values", { intent: "something_new", emotionAwareness: "also_new" }],
  ])("%s gives the default order", (_, intake) => {
    expect(ids(intake)).toEqual(DEFAULT);
  });

  it("never drops a row or mutates the default list", () => {
    const before = STARTER_ROWS.map((r) => r.id);
    const out = orderStarterRows({ intent: "just_looking", emotionAwareness: "numb_or_cant_tell" });
    expect(out).not.toBe(STARTER_ROWS);
    expect([...out.map((r) => r.id)].sort()).toEqual([...DEFAULT].sort());
    expect(STARTER_ROWS.map((r) => r.id)).toEqual(before);
  });
});
