import { describe, expect, it } from "vitest";
import {
	BAR_MAX,
	BAR_MIN,
	barHeight,
	heldReadout,
	type IntensityDay,
	levelY,
	peakIndex,
	relationTo,
	SCALE,
	shortDate,
	weekA11y,
	weekSentence,
	weekStart,
} from "@/features/you/home/week/week-model";

const NAMES = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

/** The board's week (WEEK), today Thursday. */
function week(values: (number | null)[], today = 3): IntensityDay[] {
	return values.map((intensity, i) => ({
		dayName: NAMES[i],
		intensity,
		isToday: i === today,
		label: NAMES[i][0],
	}));
}
const BOARD = week([4.4, 7.6, 5.2, 3.1, null, null, null]);
const USUAL = { high: 5.6, low: 3.8, median: 4.7 };

describe("the plot", () => {
	it("puts the four scale labels at least 24 pt apart", () => {
		const ys = SCALE.map((s) => levelY(s.at));
		for (let i = 1; i < ys.length; i++) {
			expect(ys[i - 1] - ys[i]).toBeGreaterThanOrEqual(24);
		}
	});

	it("keeps bars between the sliver and the top", () => {
		expect(barHeight(null)).toBe(BAR_MIN);
		expect(barHeight(0.1)).toBe(BAR_MIN);
		expect(barHeight(10)).toBe(BAR_MAX);
		expect(barHeight(12)).toBe(BAR_MAX);
	});
});

describe("relationTo", () => {
	it("reads the band's range, not the line", () => {
		expect(relationTo(5.6, USUAL)).toBe("within");
		expect(relationTo(5.61, USUAL)).toBe("above");
		expect(relationTo(3.8, USUAL)).toBe("within");
		expect(relationTo(3.79, USUAL)).toBe("below");
		// Under the median but inside the band is still within.
		expect(relationTo(4, USUAL)).toBe("within");
	});
});

describe("peakIndex", () => {
	it("is the first highest day, or null on an empty week", () => {
		expect(peakIndex(BOARD)).toBe(1);
		expect(peakIndex(week([6, 6, null]))).toBe(0);
		expect(peakIndex(week([null, null]))).toBeNull();
	});
});

describe("weekSentence", () => {
	it("says the board's sentence: above, then back inside by the next day in the band", () => {
		expect(weekSentence({ current: true, days: BOARD, usual: USUAL })).toBe(
			"Heaviest on Tuesday, above your usual. Back inside it by Wednesday."
		);
	});

	it("skips later days that land below the band", () => {
		const days = week([4, 8, 2, 5, null, null, null]);
		expect(weekSentence({ current: true, days, usual: USUAL })).toBe(
			"Heaviest on Tuesday, above your usual. Back inside it by Thursday."
		);
	});

	it("stops after the peak when nothing later is back inside", () => {
		const days = week([4, 8, 7, null, null, null, null]);
		expect(weekSentence({ current: true, days, usual: USUAL })).toBe(
			"Heaviest on Tuesday, above your usual."
		);
	});

	it("says within and below without a way back", () => {
		expect(
			weekSentence({ current: true, days: week([5, 3]), usual: USUAL })
		).toBe("Heaviest on Monday, within your usual.");
		expect(
			weekSentence({ current: true, days: week([2, 3]), usual: USUAL })
		).toBe("Heaviest on Tuesday, below your usual.");
	});

	it("names the peak alone until there's a usual", () => {
		expect(weekSentence({ current: true, days: BOARD, usual: null })).toBe(
			"Heaviest on Tuesday."
		);
	});

	it("says the week is forming, or was empty", () => {
		const empty = week([null, null, null, null, null, null, null]);
		expect(weekSentence({ current: true, days: empty, usual: USUAL })).toBe(
			"Nothing yet this week. Its shape is still forming."
		);
		expect(weekSentence({ current: false, days: empty, usual: USUAL })).toBe(
			"No moments logged that week."
		);
	});
});

describe("dates", () => {
	const thursday = new Date(2026, 10, 12, 15, 0);

	it("starts weeks on Monday and pages back a week at a time", () => {
		expect(weekStart(thursday, 0)).toEqual(new Date(2026, 10, 9));
		expect(weekStart(thursday, -1)).toEqual(new Date(2026, 10, 2));
		expect(weekStart(new Date(2026, 10, 15, 23), 0)).toEqual(
			new Date(2026, 10, 9)
		);
	});

	it("writes a day as the board does", () => {
		expect(shortDate(weekStart(thursday, 0), 1)).toBe("Tue 10 Nov");
		expect(shortDate(new Date(2026, 9, 26), 6)).toBe("Sun 1 Nov");
	});
});

describe("heldReadout", () => {
	const start = new Date(2026, 10, 9);

	it("reads a day against your usual, in one line", () => {
		expect(
			heldReadout({ days: BOARD, index: 1, start, todayIndex: 3, usual: USUAL })
		).toEqual({ detail: undefined, value: "Tue 10 Nov · above your usual" });
	});

	it("tells a day still ahead from a quiet one", () => {
		expect(
			heldReadout({ days: BOARD, index: 5, start, todayIndex: 3, usual: USUAL })
				.value
		).toBe("Sat 14 Nov · still ahead");
		const past = week([null, 5]);
		expect(
			heldReadout({ days: past, index: 0, start, todayIndex: -1, usual: USUAL })
				.value
		).toBe("Mon 9 Nov · no moments");
	});

	it("says the level without a usual", () => {
		expect(
			heldReadout({ days: BOARD, index: 2, start, todayIndex: 3, usual: null })
				.value
		).toBe("Wed 11 Nov · moderate intensity");
	});

	it("carries B17's detail when a day has one", () => {
		const detail = {
			ended: "lighter" as const,
			moments: 2,
			topDomain: "work",
			topEmotion: "overwhelmed",
		};
		const days = BOARD.map((d, i) => (i === 1 ? { ...d, detail } : d));
		expect(
			heldReadout({ days, index: 1, start, todayIndex: 3, usual: USUAL }).detail
		).toBe(detail);
	});
});

describe("weekA11y", () => {
	it("reads each day with moments against your usual, once", () => {
		expect(weekA11y(BOARD, USUAL)).toBe(
			"Intensity by day. Monday, within your usual. Tuesday, above your usual. Wednesday, within your usual. Thursday, below your usual"
		);
		expect(weekA11y(week([7.6, null]), null)).toBe(
			"Intensity by day. Monday, high intensity"
		);
	});
});
