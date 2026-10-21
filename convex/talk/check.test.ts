import { describe, expect, it } from "vitest";
import { afterTalkIssues } from "./check";
import { CRISIS_LINE } from "./safetyScript";

const crisis = { level: "crisis" as const, triggerType: "crisis_keywords" as const, triggerConfidence: 1, triggerEvidence: "x" };
const elevated = { ...crisis, level: "elevated" as const };
const line = (seq: number, role: "person" | "companion", text: string) => ({ seq, role, text });

describe("afterTalkIssues", () => {
  it("passes an ordinary talk", () => {
    expect(afterTalkIssues([line(0, "companion", "Hey, I'm Ember."), line(1, "person", "Long day.")], undefined)).toEqual([]);
  });

  it("flags the companion naming a provider or model, even to deny it", () => {
    expect(
      afterTalkIssues([line(0, "person", "Are you ChatGPT?"), line(1, "companion", "No, I'm not ChatGPT or Claude.")], undefined),
    ).toEqual([{ kind: "provider_name", seq: 1, match: "ChatGPT" }]);
  });

  it("never flags the person's own words", () => {
    expect(afterTalkIssues([line(0, "person", "Is this Anthropic?")], undefined)).toEqual([]);
  });

  it("passes a crisis talk where the line was said verbatim", () => {
    expect(afterTalkIssues([line(0, "person", "..."), line(1, "companion", CRISIS_LINE)], crisis)).toEqual([]);
  });

  it("flags a crisis talk where the line was cut off or never said", () => {
    const cut = CRISIS_LINE.slice(0, 40);
    expect(afterTalkIssues([line(0, "companion", cut)], crisis)).toEqual([{ kind: "crisis_line" }]);
    expect(afterTalkIssues([], crisis)).toEqual([{ kind: "crisis_line" }]);
  });

  it("expects no crisis line below crisis", () => {
    expect(afterTalkIssues([line(0, "companion", "I'm here.")], elevated)).toEqual([]);
  });
});
