import { describe, expect, it } from "vitest";
import { parseChatModerationResponse, shouldModerateChatMessage } from "./classify";

describe("shouldModerateChatMessage", () => {
  it("skips trivially short messages", () => {
    expect(shouldModerateChatMessage("ok")).toBe(false);
    expect(shouldModerateChatMessage("  yeah  ")).toBe(false);
    expect(shouldModerateChatMessage("kill myself")).toBe(true);
  });

  it("skips emoji-only messages", () => {
    expect(shouldModerateChatMessage("🙏 🙏 ❤️ 🔥")).toBe(false);
  });

  it("moderates a real sentence", () => {
    expect(shouldModerateChatMessage("i don't want to be here anymore")).toBe(true);
  });

  it("counts words in scripts without spaces", () => {
    expect(shouldModerateChatMessage("我不想活了")).toBe(true);
    expect(shouldModerateChatMessage("好")).toBe(false);
  });

  it("a short contact leak is the regex lane's job, not the model's", () => {
    expect(shouldModerateChatMessage("@nate.ig")).toBe(false);
  });
});

describe("parseChatModerationResponse", () => {
  it("reads a fenced verdict", () => {
    expect(
      parseChatModerationResponse(
        '```json\n{"crisis":"crisis","harassment":false,"spam":false,"contact":false,"confidence":0.93}\n```',
      ),
    ).toEqual({ crisis: "crisis", harassment: false, spam: false, contact: false, confidence: 0.93 });
  });

  it("an unknown level or a missing field degrades to the quiet verdict", () => {
    expect(parseChatModerationResponse('{"crisis":"panic","harassment":"yes"}')).toEqual({
      crisis: "none",
      harassment: false,
      spam: false,
      contact: false,
      confidence: 0,
    });
  });
});
