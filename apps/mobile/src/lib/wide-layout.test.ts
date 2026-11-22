import { describe, expect, it } from "vitest";
import {
	capped,
	columnPad,
	isWide,
	READING_WIDTH,
	rowTile,
} from "@/lib/wide-layout";

const PHONES = [
	{ height: 667, width: 375 },
	{ height: 844, width: 390 },
	{ height: 874, width: 402 },
	{ height: 956, width: 440 },
];
const IPAD_13 = { height: 1376, width: 1032 };
const IPAD_MINI = { height: 1133, width: 744 };

describe("phones keep their phone layout", () => {
	it.each(PHONES)("$width×$height", (screen) => {
		expect(isWide(screen)).toBe(false);
		expect(columnPad(screen, 24)).toBe(24);
		expect(capped(screen, 354, 460)).toBe(354);
		expect(
			rowTile(screen, { gap: 12, row: screen.width - 40, size: 148 })
		).toBe(148);
	});
});

describe("wide screens", () => {
	it("count from the shortest side, either way up", () => {
		expect(isWide(IPAD_13)).toBe(true);
		expect(isWide({ height: 1032, width: 1376 })).toBe(true);
		expect(isWide(IPAD_MINI)).toBe(true);
	});

	it("centre the reading column", () => {
		const pad = columnPad(IPAD_13, 24);
		expect(IPAD_13.width - 2 * pad).toBe(READING_WIDTH);
	});

	it("never pad less than the phone pad", () => {
		expect(columnPad({ height: 900, width: 650 }, 24)).toBe(24);
	});

	it("cap a size", () => {
		expect(capped(IPAD_13, 984, 460)).toBe(460);
		expect(capped(IPAD_13, 300, 460)).toBe(300);
	});

	it("grow row tiles so four and a half span the row", () => {
		const row = IPAD_13.width - 40;
		const size = rowTile(IPAD_13, { gap: 12, row, size: 148 });
		expect(size).toBeGreaterThan(148);
		expect(4 * (size + 12) + size / 2).toBeLessThanOrEqual(row);
		expect(5 * (size + 12) + size / 2).toBeGreaterThan(row);
	});

	it("never shrink a tile below its phone size", () => {
		expect(
			rowTile({ height: 900, width: 620 }, { gap: 12, row: 580, size: 148 })
		).toBe(148);
	});
});
