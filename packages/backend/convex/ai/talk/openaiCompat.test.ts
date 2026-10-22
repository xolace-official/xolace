import { describe, expect, it } from "vitest";
import { toAnthropicRequest } from "./openaiCompat";
import { createEventTranslator, SSE_DONE, sseChunk } from "./openaiSse";

describe("toAnthropicRequest", () => {
	it("lifts the agent prompt into system and opens on the person when the agent spoke first", () => {
		const req = toAnthropicRequest([
			{ content: "You are Ember.", role: "system" },
			{ content: "Hey, I'm here. What's on your mind?", role: "assistant" },
			{ content: "Work has been a lot.", role: "user" },
		]);

		expect(req.system).toBe("You are Ember.");
		expect(req.messages).toEqual([
			{ content: "(The talk begins.)", role: "user" },
			{ content: "Hey, I'm here. What's on your mind?", role: "assistant" },
			{ content: "Work has been a lot.", role: "user" },
		]);
	});

	it("keeps only spoken text: parts join, tool traffic drops, back-to-back turns merge", () => {
		const req = toAnthropicRequest([
			{
				content: [
					{ text: "I can't sleep.", type: "text" },
					{ type: "image_url" },
				],
				role: "user",
			},
			{ content: null, role: "assistant" },
			{ content: '{"ok":true}', role: "tool" },
			{ content: "Again.", role: "user" },
		]);

		expect(req.system).toBe("");
		expect(req.messages).toEqual([
			{ content: "I can't sleep.\n\nAgain.", role: "user" },
		]);
	});
});

describe("toAnthropicRequest with tools", () => {
	const endCall = {
		function: {
			description: "End the call.",
			name: "end_call",
			parameters: {
				properties: { reason: { type: "string" } },
				type: "object",
			},
		},
		type: "function",
	};

	it("offers the agent's tools to the model as Anthropic tools", () => {
		const req = toAnthropicRequest(
			[{ content: "Bye.", role: "user" }],
			[endCall]
		);

		expect(req.tools).toEqual([
			{
				description: "End the call.",
				input_schema: {
					properties: { reason: { type: "string" } },
					type: "object",
				},
				name: "end_call",
			},
		]);
	});

	it("replays a past tool call as tool_use, answered by its tool_result", () => {
		const req = toAnthropicRequest([
			{ content: "That's all, thanks.", role: "user" },
			{
				content: "Take care.",
				role: "assistant",
				tool_calls: [
					{
						function: { arguments: '{"reason":"done"}', name: "end_call" },
						id: "call_1",
						type: "function",
					},
				],
			},
			{ content: "ok", role: "tool", tool_call_id: "call_1" },
			{ content: "Wait, one more thing.", role: "user" },
		]);

		expect(req.messages).toEqual([
			{ content: "That's all, thanks.", role: "user" },
			{
				content: [
					{ text: "Take care.", type: "text" },
					{
						id: "call_1",
						input: { reason: "done" },
						name: "end_call",
						type: "tool_use",
					},
				],
				role: "assistant",
			},
			{
				content: [
					{ content: "ok", tool_use_id: "call_1", type: "tool_result" },
					{ text: "Wait, one more thing.", type: "text" },
				],
				role: "user",
			},
		]);
	});

	it("answers a tool call ElevenLabs never reported back, so the history stays valid", () => {
		const req = toAnthropicRequest([
			{ content: "Bye.", role: "user" },
			{
				role: "assistant",
				tool_calls: [
					{
						function: { arguments: "", name: "end_call" },
						id: "call_2",
						type: "function",
					},
				],
			},
			{ content: "Actually, no.", role: "user" },
		]);

		expect(req.messages.slice(1)).toEqual([
			{
				content: [
					{ id: "call_2", input: {}, name: "end_call", type: "tool_use" },
				],
				role: "assistant",
			},
			{
				content: [
					{ content: "ok", tool_use_id: "call_2", type: "tool_result" },
					{ text: "Actually, no.", type: "text" },
				],
				role: "user",
			},
		]);
	});
});

describe("sseChunk", () => {
	it("frames a text delta as an OpenAI chat.completion.chunk event", () => {
		const line = sseChunk(
			{ created: 1_700_000_000, id: "chatcmpl-1", model: "claude-haiku-5-5" },
			{ content: "Hi" }
		);

		expect(line.endsWith("\n\n")).toBe(true);
		expect(JSON.parse(line.slice("data: ".length))).toEqual({
			choices: [{ delta: { content: "Hi" }, finish_reason: null, index: 0 }],
			created: 1_700_000_000,
			id: "chatcmpl-1",
			model: "claude-haiku-5-5",
			object: "chat.completion.chunk",
		});
	});

	it("closes with an empty delta carrying finish_reason, then [DONE]", () => {
		const line = sseChunk({ created: 1, id: "c", model: "m" }, {}, "stop");

		expect(JSON.parse(line.slice(6)).choices).toEqual([
			{ delta: {}, finish_reason: "stop", index: 0 },
		]);
		expect(SSE_DONE).toBe("data: [DONE]\n\n");
	});
});

describe("createEventTranslator", () => {
	it("streams spoken text, then a tool call as OpenAI tool_calls deltas, finishing on tool_calls", () => {
		const translate = createEventTranslator();
		const events = [
			{
				content_block: { text: "", type: "text" },
				index: 0,
				type: "content_block_start",
			},
			{
				delta: { text: "Take care.", type: "text_delta" },
				index: 0,
				type: "content_block_delta",
			},
			{
				content_block: {
					id: "toolu_1",
					input: {},
					name: "end_call",
					type: "tool_use",
				},
				index: 1,
				type: "content_block_start",
			},
			{
				delta: { partial_json: '{"reason":', type: "input_json_delta" },
				index: 1,
				type: "content_block_delta",
			},
			{
				delta: { partial_json: '"done"}', type: "input_json_delta" },
				index: 1,
				type: "content_block_delta",
			},
			{ delta: { stop_reason: "tool_use" }, type: "message_delta" },
		];

		expect(events.map((e) => translate(e))).toEqual([
			null,
			{ delta: { content: "Take care." } },
			{
				delta: {
					tool_calls: [
						{
							function: { arguments: "", name: "end_call" },
							id: "toolu_1",
							index: 0,
							type: "function",
						},
					],
				},
			},
			{
				delta: {
					tool_calls: [{ function: { arguments: '{"reason":' }, index: 0 }],
				},
			},
			{
				delta: {
					tool_calls: [{ function: { arguments: '"done"}' }, index: 0 }],
				},
			},
			{ finish: "tool_calls" },
		]);
	});

	it("maps the model running out of room to finish_reason length", () => {
		expect(
			createEventTranslator()({
				delta: { stop_reason: "max_tokens" },
				type: "message_delta",
			})
		).toEqual({ finish: "length" });
	});
});
