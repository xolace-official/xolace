import { describe, expect, it } from "vitest";
import { canSeedReflection } from "@/src/features/quotes/components/archive/reply-seed";

const replied = { reply: "I kept thinking about this all day", replyModeration: undefined };

describe("canSeedReflection", () => {
  it("offers on a saved, replied, unflagged quote with no live session", () => {
    expect(canSeedReflection(replied, false)).toBe(true);
  });

  it("stays hidden while a session is active", () => {
    expect(canSeedReflection(replied, true)).toBe(false);
  });

  it("never offers on a flagged reply", () => {
    const flagged = {
      reply: replied.reply,
      replyModeration: { flagged: true, categories: ["self-harm"], checkedAt: 0 },
    };
    expect(canSeedReflection(flagged, false)).toBe(false);
  });

  it("needs an actual reply", () => {
    expect(canSeedReflection({ reply: undefined, replyModeration: undefined }, false)).toBe(false);
    expect(canSeedReflection({ reply: "   ", replyModeration: undefined }, false)).toBe(false);
  });
});
