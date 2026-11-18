import type { Id } from "@xolace/backend/dataModel";
import { describe, expect, it } from "vitest";
import { getEmotionLabel, momentView } from "./moments-model";

type Row = Parameters<typeof momentView>[0];

const row = (over: Partial<Row>): Row => ({
	_id: "s1" as Id<"sessions">,
	confirmationState: null,
	createdAt: 0,
	entryType: "open_prompt",
	granularLabel: null,
	hasMirrorAudio: false,
	mirrorText: "",
	pathChosen: null,
	primaryEmotion: null,
	toneUsed: null,
	...over,
});

describe("momentView", () => {
	it("turns production's em dashes into commas", () => {
		expect(
			momentView(row({ mirrorText: "You're not behind — you're tired." })).quote
		).toBe("You're not behind, you're tired.");
		expect(
			momentView(row({ mirrorText: " Set it down—for tonight. " })).quote
		).toBe("Set it down, for tonight.");
	});

	it("names the finer label first, then the primary emotion", () => {
		expect(
			momentView(row({ granularLabel: "self-doubt", primaryEmotion: "fear" }))
				.emotion
		).toBe("self-doubt");
		expect(momentView(row({ primaryEmotion: "fear" })).emotion).toBe("fear");
		expect(momentView(row({})).emotion).toBeNull();
	});

	it("badges a spoken mirror", () => {
		expect(momentView(row({ hasMirrorAudio: true })).audio).toBe(true);
	});
});

describe("getEmotionLabel", () => {
	it("reads hyphens as spaces, capitalised, and Reflection with none", () => {
		expect(getEmotionLabel("self-doubt")).toBe("Self doubt");
		expect(getEmotionLabel(null)).toBe("Reflection");
	});
});
