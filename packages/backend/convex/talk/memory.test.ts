import { describe, expect, it } from "vitest";
import { recallLine, renderMemory } from "./memory";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 20);

describe("renderMemory", () => {
	it("carries the profile and recent moments, each with its entry type, in plain words", () => {
		const text = renderMemory(
			{
				intake: null,
				memoryOn: true,
				moments: [
					{
						createdAt: now - 2 * DAY,
						entryType: "talk",
						granularLabel: "dread",
						primaryEmotion: "anxiety",
						temporalContext: "ongoing",
						thematicTags: ["work"],
						userLanguageTags: ["drowning"],
					},
					{
						createdAt: now - 9 * DAY,
						entryType: "open_prompt",
						primaryEmotion: "sadness",
						thematicTags: [],
						userLanguageTags: [],
					},
				],
				profile: "Recurring themes: work pressure",
			},
			now
		);
		expect(text).toContain("Recurring themes: work pressure");
		expect(text).toContain(
			"2 days ago, a talk with you: dread; about work; their words: drowning; ongoing"
		);
		expect(text).toContain("9 days ago, a written reflection: sadness");
		expect(text).not.toContain("intensity");
	});

	it("gives intake as a hint only when it is there", () => {
		const first = renderMemory(
			{
				intake: { disclosureStyle: "bit_at_a_time" },
				memoryOn: true,
				moments: [],
				profile: null,
			},
			now
		);
		expect(first).toContain("a bit at a time");
		expect(first).not.toContain("feelings");
		expect(first).toContain("Never mention");
	});

	it("knows nothing of them with memory off", () => {
		const off = renderMemory(
			{
				intake: null,
				memoryOn: false,
				moments: [],
				profile: "Recurring themes: work",
			},
			now
		);
		expect(off).toContain("memory is off");
		expect(off).not.toContain("Recurring themes");
	});
});

describe("recallLine", () => {
	it("drops the labels line and keeps their words, dated", () => {
		expect(
			recallLine(
				{
					createdAt: now - 21 * DAY,
					entryType: "voice",
					text: "I keep thinking about Dad.\n\nIt sounds like grief.\n\nemotion: sadness | intensity: 7/10",
				},
				now
			)
		).toBe(
			"3 weeks ago, a voice reflection: I keep thinking about Dad.\n\nIt sounds like grief."
		);
	});

	it("is null for a labels-only memory", () => {
		expect(
			recallLine(
				{
					createdAt: now,
					entryType: "talk",
					text: "emotion: fear | intensity: 9/10",
				},
				now
			)
		).toBeNull();
	});

	it("caps a long memory", () => {
		const line = recallLine(
			{ createdAt: now, entryType: "talk", text: "a".repeat(5000) },
			now
		);
		expect(line!.length).toBeLessThan(900);
	});
});
