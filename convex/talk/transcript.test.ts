import { describe, expect, it } from "vitest";
import { MAX_TALK_INPUT, personText, talkLines } from "./transcript";

describe("talkLines", () => {
  it("keeps both sides' spoken text in order and drops the prompt and tool traffic", () => {
    expect(
      talkLines([
        { role: "system", content: "You are Ember." },
        { role: "assistant", content: "Hey, I'm here." },
        { role: "user", content: [{ type: "text", text: "Work has been " }, { type: "text", text: "a lot." }] },
        { role: "assistant", content: null, tool_calls: [{ id: "t1", function: { name: "end_call" } }] },
        { role: "tool", content: "ok", tool_call_id: "t1" },
        { role: "user", content: "   " },
        { role: "user", content: "..." },
      ]),
    ).toEqual([
      { role: "companion", text: "Hey, I'm here." },
      { role: "person", text: "Work has been a lot." },
    ]);
  });
});

describe("personText", () => {
  it("is the person's lines only", () => {
    expect(
      personText([
        { role: "companion", text: "What's on your mind?" },
        { role: "person", text: "I can't sleep." },
        { role: "companion", text: "Since when?" },
        { role: "person", text: "Since the move." },
      ]),
    ).toBe("I can't sleep.\nSince the move.");
  });

  it("is empty when the person said nothing", () => {
    expect(personText([{ role: "companion", text: "Still there?" }])).toBe("");
  });

  it("is empty when the person's lines are only transcribed noise", () => {
    expect(
      personText([
        { role: "companion", text: "Still there?" },
        { role: "person", text: "..." },
        { role: "person", text: "…" },
      ]),
    ).toBe("");
  });

  it("keeps words in any script", () => {
    expect(personText([{ role: "person", text: "眠れない。" }])).toBe("眠れない。");
  });

  it("keeps the end of a talk past the cap", () => {
    const text = personText([
      { role: "person", text: "a".repeat(MAX_TALK_INPUT) },
      { role: "person", text: "the landing" },
    ]);
    expect(text).toHaveLength(MAX_TALK_INPUT);
    expect(text.endsWith("\nthe landing")).toBe(true);
  });
});
