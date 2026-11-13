import { describe, expect, it } from "vitest";
import {
	buildReplyPrompt,
	FIRST_LINE_MAX_CHARS,
	type ReplyInput,
	shapeReply,
} from "./replyPrompt";

const INPUT: ReplyInput = {
	card: { domain: "work", text: "Work has been a lot this week." },
	memory: "MEMORY BLOCK",
	reach: "warm",
	resources: false,
	trigger: { kind: "text", level: "none", text: "my boss again" },
	turns: [{ role: "person", text: "earlier line" }],
};

describe("buildReplyPrompt", () => {
	it("carries the Reach voice, the memory, the card, the turns and the words", () => {
		const { system, user } = buildReplyPrompt({ ...INPUT, reach: "direct" });
		expect(system).toContain("Direct: exactly two plain lines");
		expect(system).toContain("MEMORY BLOCK");
		expect(system).toContain("There is no support button");
		expect(user).toContain("Work has been a lot this week.");
		expect(user).toContain("It's about their work & studies.");
		expect(user).toContain("Them: earlier line");
		expect(user).toContain("<their_words>\nmy boss again\n</their_words>");
	});

	it("says support is below only when it is", () => {
		const { system, user } = buildReplyPrompt({
			...INPUT,
			resources: true,
			trigger: { kind: "text", level: "elevated", text: "hard day" },
		});
		expect(system).toContain("A Support resources button sits under");
		expect(user).toContain("point to the support below");
	});
});

describe("shapeReply", () => {
	const rules = { domain: "work" as const, reach: "warm" as const };

	it("keeps a short general first line and the rest", () => {
		expect(shapeReply('"Good to hear.\n\nWhat helped?"', rules)).toBe(
			"Good to hear.\nWhat helped?"
		);
	});

	it("refuses one line, a long first line, or the life area up front", () => {
		expect(shapeReply("Good to hear, what helped?", rules)).toBeNull();
		expect(
			shapeReply(`${"x".repeat(FIRST_LINE_MAX_CHARS + 1)}\nmore`, rules)
		).toBeNull();
		expect(shapeReply("Work sounds lighter.\nWhat helped?", rules)).toBeNull();
		expect(shapeReply("Good to hear.\nWork sounds lighter.", rules)).toBe(
			"Good to hear.\nWork sounds lighter."
		);
	});

	it("holds quiet to exactly two lines", () => {
		const quiet = { reach: "quiet" as const };
		expect(
			shapeReply("Good to hear.\nTell me if you like.", quiet)
		).not.toBeNull();
		expect(shapeReply("Good.\nOne.\nTwo.", quiet)).toBeNull();
	});
});
