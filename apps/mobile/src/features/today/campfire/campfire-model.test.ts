import { describe, expect, it } from "vitest";
import { campfireLine, campfireView } from "./campfire-model";

const COUNT = {
	count: 38,
	emotion: "anxiety",
	status: "count",
	weekStart: 0,
} as const;

describe("campfireView", () => {
	it("draws the cohort's count", () => {
		expect(campfireView(COUNT, null, false)).toEqual({
			count: 38,
			emotion: "anxiety",
			kind: "count",
		});
	});

	it("writes a hyphenated feeling as words", () => {
		expect(
			campfireView({ emotion: "self-doubt", status: "warming" }, null, false)
		).toEqual({
			emotion: "self doubt",
			kind: "warming",
		});
	});

	it("falls back to the v2 intake's count when the cohort is hidden", () => {
		const stats = { campers: 1200, lighterPercent: 62 };
		expect(campfireView({ status: "hidden" }, stats, true)).toEqual({
			count: 1200,
			kind: "stats",
			lighterPercent: 62,
		});
		expect(campfireView({ status: "hidden" }, stats, false)).toBeNull();
		expect(campfireView({ status: "hidden" }, null, true)).toBeNull();
	});

	it("draws nothing while loading", () => {
		expect(campfireView(undefined, null, true)).toBeNull();
	});
});

describe("campfireLine", () => {
	it("says the count, the campers and the feeling", () => {
		expect(
			campfireLine({ count: 38, emotion: "anxiety", kind: "count" })
		).toEqual({
			count: 38,
			label:
				"38 campers sat with anxiety by the fire this week. You are not alone.",
			rest: " campers",
			tail: " sat with anxiety by the fire this week.",
		});
	});

	it("says one camper", () => {
		expect(
			campfireLine({ count: 1, emotion: "anxiety", kind: "count" }).rest
		).toBe(" camper");
	});

	it("says others, with no number, while warming", () => {
		expect(
			campfireLine({ emotion: "anxiety", kind: "warming" }).count
		).toBeNull();
	});

	it("drops the second sentence when there's no lighter share", () => {
		expect(
			campfireLine({ count: 1, kind: "stats", lighterPercent: null }).tail
		).toBe(" person has sat by this fire.");
	});
});
