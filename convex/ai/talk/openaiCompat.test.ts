import { describe, expect, it } from "vitest";
import { sseChunk, SSE_DONE, toAnthropicRequest } from "./openaiCompat";

describe("toAnthropicRequest", () => {
  it("lifts the agent prompt into system and opens on the person when the agent spoke first", () => {
    const req = toAnthropicRequest([
      { role: "system", content: "You are Ember." },
      { role: "assistant", content: "Hey, I'm here. What's on your mind?" },
      { role: "user", content: "Work has been a lot." },
    ]);

    expect(req.system).toBe("You are Ember.");
    expect(req.messages).toEqual([
      { role: "user", content: "(The talk begins.)" },
      { role: "assistant", content: "Hey, I'm here. What's on your mind?" },
      { role: "user", content: "Work has been a lot." },
    ]);
  });

  it("keeps only spoken text: parts join, tool traffic drops, back-to-back turns merge", () => {
    const req = toAnthropicRequest([
      { role: "user", content: [{ type: "text", text: "I can't sleep." }, { type: "image_url" }] },
      { role: "assistant", content: null },
      { role: "tool", content: "{\"ok\":true}" },
      { role: "user", content: "Again." },
    ]);

    expect(req.system).toBe("");
    expect(req.messages).toEqual([{ role: "user", content: "I can't sleep.\n\nAgain." }]);
  });
});

describe("sseChunk", () => {
  it("frames a text delta as an OpenAI chat.completion.chunk event", () => {
    const line = sseChunk({ id: "chatcmpl-1", model: "claude-haiku-5-5", created: 1700000000 }, { content: "Hi" });

    expect(line.endsWith("\n\n")).toBe(true);
    expect(JSON.parse(line.slice("data: ".length))).toEqual({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      created: 1700000000,
      model: "claude-haiku-5-5",
      choices: [{ index: 0, delta: { content: "Hi" }, finish_reason: null }],
    });
  });

  it("closes with an empty delta carrying finish_reason, then [DONE]", () => {
    const line = sseChunk({ id: "c", model: "m", created: 1 }, {}, "stop");

    expect(JSON.parse(line.slice(6)).choices).toEqual([{ index: 0, delta: {}, finish_reason: "stop" }]);
    expect(SSE_DONE).toBe("data: [DONE]\n\n");
  });
});
