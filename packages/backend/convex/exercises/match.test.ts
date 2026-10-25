import { describe, expect, it } from "vitest";
import { type MatchInput, matchExercise } from "./match";

const base: MatchInput = {
	confirmationState: "confirmed",
	entryType: "open_prompt",
	intensity: 5,
	primaryEmotion: "sadness",
	userLanguageTags: [],
};

describe("matchExercise", () => {
	it("defaults to let_it_land for sadness at moderate intensity", () => {
		const [first] = matchExercise(base);
		expect(first).toBe("let_it_land");
	});

	it("routes high intensity (>=8) to reset", () => {
		const [first] = matchExercise({ ...base, intensity: 8 });
		expect(first).toBe("reset");
	});

	it("routes anxiety emotion to reset regardless of intensity", () => {
		const [first] = matchExercise({
			...base,
			intensity: 4,
			primaryEmotion: "anxiety",
		});
		expect(first).toBe("reset");
	});

	it("routes numbness emotion to find_your_edges", () => {
		const [first] = matchExercise({ ...base, primaryEmotion: "numbness" });
		expect(first).toBe("find_your_edges");
	});

	it("routes numb language tags to find_your_edges", () => {
		const [first] = matchExercise({
			...base,
			userLanguageTags: ["empty", "blank"],
		});
		expect(first).toBe("find_your_edges");
	});

	it("routes helplessness emotion to make_room", () => {
		const [first] = matchExercise({ ...base, primaryEmotion: "helplessness" });
		expect(first).toBe("make_room");
	});

	it("reads free-text granular labels through the emotion aliases (#536)", () => {
		expect(
			matchExercise({
				...base,
				granularLabel: "worried",
				intensity: 4,
				primaryEmotion: "confusion",
			})[0]
		).toBe("reset");
		// The original word still counts, not just the root it maps to.
		expect(
			matchExercise({
				...base,
				granularLabel: "despair",
				primaryEmotion: "confusion",
			})[0]
		).toBe("make_room");
	});

	it("routes stuck language tags to make_room", () => {
		const [first] = matchExercise({
			...base,
			userLanguageTags: ["stuck", "trapped"],
		});
		expect(first).toBe("make_room");
	});

	it("routes shame emotion to soften_toward_it", () => {
		const [first] = matchExercise({ ...base, primaryEmotion: "shame" });
		expect(first).toBe("soften_toward_it");
	});

	it("routes worthless language tag to soften_toward_it", () => {
		const [first] = matchExercise({
			...base,
			userLanguageTags: ["worthless", "not enough"],
		});
		expect(first).toBe("soften_toward_it");
	});

	it("routes anger emotion to speak_to_it", () => {
		const [first] = matchExercise({ ...base, primaryEmotion: "anger" });
		expect(first).toBe("speak_to_it");
	});

	it("routes rage language tag to speak_to_it", () => {
		const [first] = matchExercise({
			...base,
			userLanguageTags: ["rage", "betrayal"],
		});
		expect(first).toBe("speak_to_it");
	});

	it("routes gave_up state to reset first", () => {
		const [first] = matchExercise({ ...base, confirmationState: "gave_up" });
		expect(first).toBe("reset");
	});

	it("routes abandoned state to reset first", () => {
		const [first] = matchExercise({ ...base, confirmationState: "abandoned" });
		expect(first).toBe("reset");
	});

	it("always returns all 6 exercises in ranked list", () => {
		const result = matchExercise(base);
		expect(result).toHaveLength(6);
		const all = [
			"let_it_land",
			"find_your_edges",
			"make_room",
			"speak_to_it",
			"soften_toward_it",
			"reset",
		];
		expect(result.sort()).toEqual(all.sort());
	});

	describe("catch-all ranks on meaning (#569)", () => {
		const today = [
			"let_it_land",
			"make_room",
			"soften_toward_it",
			"find_your_edges",
			"reset",
			"speak_to_it",
		];

		it("puts the closest exercise above the floor first", () => {
			const ranked = matchExercise(base, {
				find_your_edges: 0.45,
				let_it_land: 0.1,
				speak_to_it: 0.6,
			});
			expect(ranked).toEqual([
				"speak_to_it",
				"find_your_edges",
				"let_it_land",
				"make_room",
				"soften_toward_it",
				"reset",
			]);
		});

		it("keeps today's order when nothing clears the floor", () => {
			expect(matchExercise(base, { reset: 0.2, speak_to_it: 0.29 })).toEqual(
				today
			);
		});

		it("keeps today's order with no vector", () => {
			expect(matchExercise(base, undefined)).toEqual(today);
		});

		it("never lets meaning reorder a safety or emotion step", () => {
			const close = { make_room: 0.8, speak_to_it: 0.9 };
			expect(matchExercise({ ...base, intensity: 9 }, close)).toEqual(
				matchExercise({ ...base, intensity: 9 })
			);
			expect(
				matchExercise({ ...base, confirmationState: "gave_up" }, close)[0]
			).toBe("reset");
			expect(
				matchExercise({ ...base, primaryEmotion: "numbness" }, close)[0]
			).toBe("find_your_edges");
			expect(
				matchExercise({ ...base, primaryEmotion: "shame" }, close)[0]
			).toBe("soften_toward_it");
		});
	});
});
