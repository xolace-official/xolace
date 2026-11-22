import { describe, expect, it } from "vitest";
import {
	type ExerciseTitle,
	isAtRisk,
	type MatchInput,
	matchExercise,
} from "./match";

const FIRST_SIX: ExerciseTitle[] = [
	"let_it_land",
	"find_your_edges",
	"make_room",
	"speak_to_it",
	"soften_toward_it",
	"reset",
];
const MODERATE: ExerciseTitle[] = [
	"pause_before_acting",
	"slow_it_down",
	"not_only_you",
	"name_the_room",
];

const GROUNDING: ExerciseTitle[] = [
	"reset",
	"find_your_edges",
	"slow_it_down",
	"name_the_room",
];
/** One session for each ladder step, the catch-all included. */
const FEELINGS: Partial<MatchInput>[] = [
	{ primaryEmotion: "sadness" },
	{ primaryEmotion: "anxiety" },
	{ primaryEmotion: "numbness" },
	{ primaryEmotion: "helplessness" },
	{ primaryEmotion: "shame" },
	{ primaryEmotion: "anger" },
	{ primaryEmotion: "loneliness" },
	{ primaryEmotion: "joy", userLanguageTags: ["left out"] },
];

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

	it("always returns every exercise in the ranked list", () => {
		expect([...matchExercise(base)].sort()).toEqual(
			[...FIRST_SIX, ...MODERATE].sort()
		);
	});

	describe("the four for moderate moments", () => {
		it("each leads for the feeling it was written for", () => {
			expect(
				matchExercise({ ...base, intensity: 6, primaryEmotion: "anger" })[0]
			).toBe("pause_before_acting");
			expect(
				matchExercise({
					...base,
					intensity: 4,
					primaryEmotion: "frustration",
				})[0]
			).toBe("speak_to_it");
			expect(matchExercise({ ...base, primaryEmotion: "loneliness" })[0]).toBe(
				"not_only_you"
			);
			expect(
				matchExercise({ ...base, userLanguageTags: ["left out"] })[0]
			).toBe("not_only_you");
		});

		it("comes next, so the swap sheet offers it, where it fits", () => {
			const next = (input: Partial<MatchInput>) =>
				matchExercise({ ...base, ...input }).find((t) => t !== "reset");
			expect(next({ intensity: 4, primaryEmotion: "anxiety" })).toBe(
				"slow_it_down"
			);
			expect(next({ primaryEmotion: "stress" })).toBe("slow_it_down");
			expect(
				matchExercise({ ...base, primaryEmotion: "numbness" }).slice(0, 2)
			).toEqual(["find_your_edges", "name_the_room"]);
			expect(
				matchExercise({ ...base, primaryEmotion: "shame" }).slice(0, 2)
			).toEqual(["soften_toward_it", "not_only_you"]);
			expect(
				matchExercise({ ...base, intensity: 4, primaryEmotion: "anger" }).slice(
					0,
					2
				)
			).toEqual(["speak_to_it", "pause_before_acting"]);
		});
	});

	describe("a flagged session gets only grounding", () => {
		const signals: [string, Partial<MatchInput>][] = [
			["the risk flag", { atRisk: isAtRisk({ riskFlag: true }) }],
			["an escalation", { atRisk: isAtRisk({ escalated: true }) }],
			[
				"an elevated level",
				{ atRisk: isAtRisk({ safeguardLevel: "elevated" }) },
			],
			["a crisis level", { atRisk: isAtRisk({ safeguardLevel: "crisis" }) }],
			["intensity 8", { intensity: 8 }],
			["intensity 10", { intensity: 10 }],
		];

		for (const [signal, flag] of signals) {
			it(`gives ${signal} the four, Three breaths first`, () => {
				for (const feeling of FEELINGS) {
					const ranked = matchExercise({ ...base, ...feeling, ...flag });
					expect(ranked[0], signal).toBe("reset");
					expect([...ranked].sort(), signal).toEqual([...GROUNDING].sort());
				}
			});
		}

		it("is never empty and never offers the other six, whatever the session", () => {
			const states: MatchInput["confirmationState"][] = [
				"confirmed",
				"refined",
				"gave_up",
				"abandoned",
			];
			const close = { let_it_land: 0.9, name_the_room: 0.8, speak_to_it: 0.95 };
			for (const feeling of FEELINGS) {
				for (const confirmationState of states) {
					for (const similarity of [undefined, close]) {
						const ranked = matchExercise(
							{ ...base, ...feeling, atRisk: true, confirmationState },
							similarity
						);
						expect(ranked.length).toBeGreaterThan(0);
						expect(ranked.every((t) => GROUNDING.includes(t))).toBe(true);
					}
				}
			}
		});

		it("orders the rest as the feeling would have", () => {
			const flagged = (input: Partial<MatchInput>) =>
				matchExercise({ ...base, ...input, atRisk: true });
			expect(flagged({ primaryEmotion: "numbness" })).toEqual([
				"reset",
				"find_your_edges",
				"name_the_room",
				"slow_it_down",
			]);
			expect(flagged({ primaryEmotion: "anxiety" })).toEqual([
				"reset",
				"slow_it_down",
				"find_your_edges",
				"name_the_room",
			]);
		});

		it("keeps today's matching just below the line", () => {
			const ranked = matchExercise({
				...base,
				intensity: 7,
				primaryEmotion: "shame",
			});
			expect(ranked[0]).toBe("soften_toward_it");
			expect(ranked).toHaveLength(FIRST_SIX.length + MODERATE.length);
		});
	});

	describe("isAtRisk", () => {
		it("reads the risk flag, an escalation, or an elevated or crisis level", () => {
			expect(isAtRisk({ riskFlag: true })).toBe(true);
			expect(isAtRisk({ escalated: true })).toBe(true);
			expect(isAtRisk({ safeguardLevel: "elevated" })).toBe(true);
			expect(isAtRisk({ safeguardLevel: "crisis" })).toBe(true);
			expect(isAtRisk({ riskFlag: false, safeguardLevel: "gentle" })).toBe(
				false
			);
			expect(isAtRisk({})).toBe(false);
		});
	});

	describe("catch-all ranks on meaning (#569)", () => {
		const today = [
			"let_it_land",
			"make_room",
			"soften_toward_it",
			"find_your_edges",
			"reset",
			"speak_to_it",
			"slow_it_down",
			"not_only_you",
			"name_the_room",
			"pause_before_acting",
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
				"slow_it_down",
				"not_only_you",
				"name_the_room",
				"pause_before_acting",
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
