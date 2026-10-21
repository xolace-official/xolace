import { describe, expect, it } from "vitest";
import { toAnthropicRequest } from "./openaiCompat";
import { createEventTranslator, sseChunk, SSE_DONE } from "./openaiSse";

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

describe("toAnthropicRequest with tools", () => {
  const endCall = {
    type: "function",
    function: {
      name: "end_call",
      description: "End the call.",
      parameters: { type: "object", properties: { reason: { type: "string" } } },
    },
  };

  it("offers the agent's tools to the model as Anthropic tools", () => {
    const req = toAnthropicRequest([{ role: "user", content: "Bye." }], [endCall]);

    expect(req.tools).toEqual([
      {
        name: "end_call",
        description: "End the call.",
        input_schema: { type: "object", properties: { reason: { type: "string" } } },
      },
    ]);
  });

  it("replays a past tool call as tool_use, answered by its tool_result", () => {
    const req = toAnthropicRequest([
      { role: "user", content: "That's all, thanks." },
      {
        role: "assistant",
        content: "Take care.",
        tool_calls: [{ id: "call_1", type: "function", function: { name: "end_call", arguments: '{"reason":"done"}' } }],
      },
      { role: "tool", tool_call_id: "call_1", content: "ok" },
      { role: "user", content: "Wait, one more thing." },
    ]);

    expect(req.messages).toEqual([
      { role: "user", content: "That's all, thanks." },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Take care." },
          { type: "tool_use", id: "call_1", name: "end_call", input: { reason: "done" } },
        ],
      },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "call_1", content: "ok" },
          { type: "text", text: "Wait, one more thing." },
        ],
      },
    ]);
  });

  it("answers a tool call ElevenLabs never reported back, so the history stays valid", () => {
    const req = toAnthropicRequest([
      { role: "user", content: "Bye." },
      { role: "assistant", tool_calls: [{ id: "call_2", type: "function", function: { name: "end_call", arguments: "" } }] },
      { role: "user", content: "Actually, no." },
    ]);

    expect(req.messages.slice(1)).toEqual([
      { role: "assistant", content: [{ type: "tool_use", id: "call_2", name: "end_call", input: {} }] },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "call_2", content: "ok" },
          { type: "text", text: "Actually, no." },
        ],
      },
    ]);
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

describe("createEventTranslator", () => {
  it("streams spoken text, then a tool call as OpenAI tool_calls deltas, finishing on tool_calls", () => {
    const translate = createEventTranslator();
    const events = [
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Take care." } },
      { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_1", name: "end_call", input: {} } },
      { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"reason":' } },
      { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '"done"}' } },
      { type: "message_delta", delta: { stop_reason: "tool_use" } },
    ];

    expect(events.map((e) => translate(e))).toEqual([
      null,
      { delta: { content: "Take care." } },
      { delta: { tool_calls: [{ index: 0, id: "toolu_1", type: "function", function: { name: "end_call", arguments: "" } }] } },
      { delta: { tool_calls: [{ index: 0, function: { arguments: '{"reason":' } }] } },
      { delta: { tool_calls: [{ index: 0, function: { arguments: '"done"}' } }] } },
      { finish: "tool_calls" },
    ]);
  });

  it("maps the model running out of room to finish_reason length", () => {
    expect(createEventTranslator()({ type: "message_delta", delta: { stop_reason: "max_tokens" } })).toEqual({ finish: "length" });
  });
});
