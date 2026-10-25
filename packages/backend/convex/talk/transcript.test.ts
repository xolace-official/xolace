import { describe, expect, it } from "vitest";
import { MAX_TALK_INPUT, personText, talkLines } from "./transcript";

describe("talkLines", () => {
	it("keeps both sides' spoken text in order and drops the prompt and tool traffic", () => {
		expect(
			talkLines([
				{ content: "You are Ember.", role: "system" },
				{ content: "Hey, I'm here.", role: "assistant" },
				{
					content: [
						{ text: "Work has been ", type: "text" },
						{ text: "a lot.", type: "text" },
					],
					role: "user",
				},
				{
					content: null,
					role: "assistant",
					tool_calls: [{ function: { name: "end_call" }, id: "t1" }],
				},
				{ content: "ok", role: "tool", tool_call_id: "t1" },
				{ content: "   ", role: "user" },
				{ content: "...", role: "user" },
			])
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
			])
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
			])
		).toBe("");
	});

	it("keeps words in any script", () => {
		expect(personText([{ role: "person", text: "眠れない。" }])).toBe(
			"眠れない。"
		);
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
