import { describe, expect, it } from "vitest";
import { streakStep } from "./streak-step";

/** Replays the streaks a mounted calendar sees, acknowledging like the component does. */
function play(streaks: (number | undefined)[], acknowledged: number) {
	let seen = acknowledged;
	const steps = streaks.map((streak) => {
		const step = streakStep(streak, seen);
		if (step === "reset" || step === "reveal") {
			seen = streak ?? seen;
		}
		return step;
	});
	return { seen, steps };
}

describe("streakStep", () => {
	it("doesn't replay the reveal when a fresh screen loads a seen streak", () => {
		// Landing back on reflect after a talk: nothing loaded, then the 5 already seen.
		expect(play([undefined, 5], 5)).toEqual({
			seen: 5,
			steps: ["wait", "settled"],
		});
	});

	it("replays when a not-yet-loaded streak is read as 0 (the old input)", () => {
		expect(play([0, 5], 5).steps).toEqual(["reset", "reveal"]);
	});

	it("reveals a streak that went up", () => {
		expect(play([undefined, 6], 5).steps).toEqual(["wait", "reveal"]);
	});

	it("takes a real break silently", () => {
		expect(play([0], 5)).toEqual({ seen: 0, steps: ["reset"] });
	});

	it("shows nothing for no streak", () => {
		expect(streakStep(0, 0)).toBe("settled");
	});
});
