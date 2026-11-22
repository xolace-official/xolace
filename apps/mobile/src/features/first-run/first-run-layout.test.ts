import { describe, expect, it } from "vitest";
import { CONTROLS_BOTTOM, controlStack, stageFor } from "./first-run-layout";
import { BOARD } from "./first-run-motion";

const PILL = { h: 56, line: 22, pad: 20 };
const LINK = { h: 36, line: 19, pad: 12 };

describe("the board's bottom controls under Dynamic Type", () => {
	it("keep their board sizes at the default type size", () => {
		expect(controlStack(702, 8, CONTROLS_BOTTOM, [PILL, LINK], 1)).toEqual([
			{ h: 56, max: 1, top: 702 },
			{ h: 36, max: 1, top: 766 },
		]);
	});

	it("grow downward, never past the home indicator", () => {
		const [pill, link] = controlStack(
			702,
			8,
			CONTROLS_BOTTOM,
			[PILL, LINK],
			3.1
		);
		expect(pill.top).toBe(702);
		expect(pill.h).toBeGreaterThanOrEqual(56);
		expect(link.h).toBeGreaterThan(36);
		expect(link.top).toBe(702 + pill.h + 8);
		expect(link.top + link.h).toBeLessThanOrEqual(CONTROLS_BOTTOM);
		expect(PILL.line * pill.max).toBeLessThanOrEqual(pill.h - PILL.pad);
		expect(LINK.line * link.max).toBeLessThanOrEqual(link.h - LINK.pad);
	});
});

describe("where the board sits", () => {
	it("stays at scale 1 on a 390-wide phone, as it always has", () => {
		expect(stageFor(390, 844, 47)).toEqual({
			dx: 0,
			dy: -7,
			H: 844,
			inset: 0,
			s: 1,
			W: 390,
		});
	});

	it("stays at scale 1 on every phone, the widest included", () => {
		for (const [w, h, top] of [
			[375, 667, 20],
			[402, 874, 62],
			[440, 956, 62],
		]) {
			const stage = stageFor(w, h, top);
			expect(stage).toEqual({
				dx: (w - BOARD.w) / 2,
				dy: top - BOARD.status,
				H: h,
				inset: 0,
				s: 1,
				W: w,
			});
		}
	});

	it("scales up to fill an iPad and centres the board both ways", () => {
		const stage = stageFor(1032, 1376, 24);
		expect(stage.s).toBeCloseTo(1376 / BOARD.h);
		expect(stage.H * stage.s).toBeCloseTo(1376);
		expect(stage.W * stage.s).toBeCloseTo(1032);
		expect(stage.dy).toBeCloseTo(0);
		expect(stage.dx * 2 + BOARD.w).toBeCloseTo(stage.W);
		expect(stage.inset).toBe(stage.dx);
	});

	it("keeps the whole board on screen on a wide tablet window", () => {
		const stage = stageFor(1376, 1032, 24);
		expect(BOARD.h * stage.s).toBeLessThanOrEqual(1032);
		expect(BOARD.w * stage.s).toBeLessThanOrEqual(1376);
		expect(stage.dy).toBeCloseTo(0);
	});
});
