import { describe, expect, it } from "vitest";
import {
	afterRelease,
	dragPhase,
	dragReach,
	MIC_DRAG,
	type MicPhase,
	releaseOf,
} from "./mic-gesture";

type Step = readonly [dx: number, dy: number];

function drag(from: MicPhase, steps: readonly Step[]): MicPhase[] {
	const phases: MicPhase[] = [];
	let phase = from;
	for (const [dx, dy] of steps) {
		phase = dragPhase(phase, dx, dy);
		phases.push(phase);
	}
	return phases;
}

describe("sliding up to cancel", () => {
	it("arms past the threshold and holds until it comes back past the disarm line", () => {
		expect(
			drag("holding", [
				[0, -20],
				[0, MIC_DRAG.cancelArm - 1],
				[0, -32],
				[0, MIC_DRAG.cancelDisarm + 1],
			])
		).toEqual(["holding", "cancel", "cancel", "holding"]);
	});

	it("doesn't arm exactly on the threshold", () => {
		expect(dragPhase("holding", 0, MIC_DRAG.cancelArm)).toBe("holding");
	});
});

describe("sliding right to lock", () => {
	it("arms past the threshold and holds until it comes back past the disarm line", () => {
		expect(
			drag("holding", [
				[30, 0],
				[MIC_DRAG.lockArm + 1, 0],
				[52, 0],
				[MIC_DRAG.lockDisarm - 1, 0],
			])
		).toEqual(["holding", "lock", "lock", "holding"]);
	});

	it("ignores sliding left", () => {
		expect(dragPhase("holding", -200, 0)).toBe("holding");
	});
});

describe("lock and cancel never arm together", () => {
	it("keeps cancel when a cancelled drag then swings right", () => {
		expect(
			drag("holding", [
				[0, -60],
				[120, -60],
			])
		).toEqual(["cancel", "cancel"]);
	});

	it("keeps lock when a locking drag then swings up", () => {
		expect(
			drag("holding", [
				[90, 0],
				[90, -120],
			])
		).toEqual(["lock", "lock"]);
	});

	it("hands over once the first one disarms", () => {
		expect(drag("cancel", [[120, -10]])).toEqual(["lock"]);
		expect(drag("lock", [[10, -60]])).toEqual(["cancel"]);
	});

	it("gives a frame that crosses both to the axis further past its line", () => {
		expect(dragPhase("holding", 70, -80)).toBe("cancel");
		expect(dragPhase("holding", 130, -44)).toBe("lock");
	});

	it("never returns both for any drag", () => {
		for (let dx = -100; dx <= 200; dx += 7) {
			for (let dy = -200; dy <= 100; dy += 7) {
				const phase = dragPhase("holding", dx, dy);
				expect(["holding", "cancel", "lock"]).toContain(phase);
			}
		}
	});
});

describe("phases a drag doesn't move", () => {
	it("leaves a press that isn't a hold yet, and a locked take, alone", () => {
		expect(dragPhase("idle", 200, -200)).toBe("idle");
		expect(dragPhase("locked", 200, -200)).toBe("locked");
	});
});

describe("letting go", () => {
	it.each([
		["idle", "tap", "idle"],
		["holding", "keep", "idle"],
		["cancel", "cancel", "idle"],
		["lock", "lock", "locked"],
		["locked", "stop", "idle"],
	] as const)("from %s does %s and leaves %s", (phase, release, next) => {
		expect(releaseOf(phase)).toBe(release);
		expect(afterRelease(phase)).toBe(next);
	});
});

describe("reach toward each target", () => {
	it("is nothing at rest or when moving away", () => {
		expect(dragReach(0, 0)).toEqual({ cancel: 0, lock: 0 });
		expect(dragReach(-30, 30)).toEqual({ cancel: 0, lock: 0 });
	});

	it("grows toward each threshold and stops there", () => {
		expect(dragReach(MIC_DRAG.lockArm / 2, MIC_DRAG.cancelArm / 2)).toEqual({
			cancel: 0.5,
			lock: 0.5,
		});
		expect(dragReach(MIC_DRAG.lockArm * 3, MIC_DRAG.cancelArm * 3)).toEqual({
			cancel: 1,
			lock: 1,
		});
	});
});
