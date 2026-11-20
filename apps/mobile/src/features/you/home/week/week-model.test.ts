import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COPY } from "@/features/you/copy";
import {
	BAR_MAX,
	BAR_MIN,
	barHeight,
	type DayDetail,
	type DetailDomain,
	DROP_DOMAIN_ABOVE,
	DROP_FEELING_ABOVE,
	dayAt,
	detailLine,
	heldReadout,
	type IntensityDay,
	levelY,
	MAX_WEEKS_BACK,
	pagedOffset,
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
	const utc = (d: number, h = 0) => new Date(Date.UTC(2026, 10, d, h));
	const thursday = utc(12, 15);

	it("starts weeks on Monday (UTC) and pages back a week at a time", () => {
		expect(weekStart(thursday, 0)).toEqual(utc(9));
		expect(weekStart(thursday, -1)).toEqual(utc(2));
		expect(weekStart(utc(15, 23), 0)).toEqual(utc(9));
		expect(weekStart(utc(16, 0), 0)).toEqual(utc(16));
	});

	it("writes a day as the board does", () => {
		expect(shortDate(weekStart(thursday, 0), 1)).toBe("Tue 10 Nov");
		expect(shortDate(new Date(Date.UTC(2026, 9, 26)), 6)).toBe("Sun 1 Nov");
	});

	describe.each([["America/New_York"], ["Australia/Sydney"], ["Asia/Kolkata"]])(
		"on a device in %s",
		(zone) => {
			const was = process.env.TZ;
			beforeAll(() => {
				process.env.TZ = zone;
			});
			afterAll(() => {
				process.env.TZ = was;
			});

			it("labels the server's week at the week boundary", () => {
				const nySunday = utc(23, 1);
				expect(weekStart(nySunday, 0)).toEqual(utc(23));
				expect(shortDate(weekStart(nySunday, 0), 0)).toBe("Mon 23 Nov");
				const sydneyMonday = utc(22, 20);
				expect(weekStart(sydneyMonday, 0)).toEqual(utc(16));
				expect(shortDate(weekStart(sydneyMonday, 0), 6)).toBe("Sun 22 Nov");
				expect(shortDate(weekStart(sydneyMonday, -1), 0)).toBe("Mon 9 Nov");
			});
		}
	);
});

describe("dayAt", () => {
	it("maps a finger to its day, clamped to the plot", () => {
		expect(dayAt(0, 210)).toBe(0);
		expect(dayAt(29.9, 210)).toBe(0);
		expect(dayAt(30, 210)).toBe(1);
		expect(dayAt(209, 210)).toBe(6);
		expect(dayAt(-12, 210)).toBe(0);
		expect(dayAt(400, 210)).toBe(6);
	});

	it("waits for layout", () => {
		expect(dayAt(10, 0)).toBeNull();
	});
});

describe("pagedOffset", () => {
	it("pages from the week shown, never past this week", () => {
		expect(pagedOffset({ by: -1, earliest: false, shown: 0 })).toBe(-1);
		expect(pagedOffset({ by: 1, earliest: false, shown: -3 })).toBe(-2);
		expect(pagedOffset({ by: 1, earliest: false, shown: 0 })).toBe(0);
	});

	it("stops at the earliest week and at the server's limit", () => {
		expect(pagedOffset({ by: -1, earliest: true, shown: -4 })).toBe(-4);
		expect(
			pagedOffset({ by: -1, earliest: false, shown: -MAX_WEEKS_BACK })
		).toBe(-MAX_WEEKS_BACK);
		expect(pagedOffset({ by: -1, earliest: false, shown: -51 })).toBe(-52);
		expect(pagedOffset({ by: -1, earliest: false, shown: -51 })).toBe(-52);
	});
});

describe("heldReadout", () => {
	const start = new Date(Date.UTC(2026, 10, 9));

	it("reads a day against your usual, in one line", () => {
		expect(
			heldReadout({ days: BOARD, index: 1, start, todayIndex: 3, usual: USUAL })
		).toEqual({ caption: null, value: "Tue 10 Nov · above your usual" });
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

	it("says B17's line under the date when the day has a detail", () => {
		const days = BOARD.map((d, i) => (i === 1 ? { ...d, detail: TUESDAY } : d));
		expect(
			heldReadout({ days, index: 1, start, todayIndex: 3, usual: USUAL })
		).toEqual({
			caption: "2 moments · Work · Overwhelm · ended lighter",
			value: "Tue 10 Nov · above your usual",
		});
	});

	it("says no second line for a day without moments, whatever it carries", () => {
		const days = BOARD.map((d, i) => (i === 5 ? { ...d, detail: TUESDAY } : d));
		expect(
			heldReadout({ days, index: 5, start, todayIndex: 3, usual: USUAL })
				.caption
		).toBeNull();
	});
});

const TUESDAY: DayDetail = {
	ended: "lighter",
	moments: 2,
	topDomain: "work",
	topEmotion: "overwhelm",
};

describe("detailLine", () => {
	it("says the board's Tuesday", () => {
		expect(detailLine(TUESDAY)).toBe(
			"2 moments · Work · Overwhelm · ended lighter"
		);
	});

	it("hides on a day with a bar but no detail (the read cap cut it) or no moments", () => {
		expect(detailLine(undefined)).toBeNull();
		expect(detailLine({ ...TUESDAY, moments: 0 })).toBeNull();
	});

	it("leaves out what the day didn't say", () => {
		const none = {
			ended: null,
			moments: 1,
			topDomain: null,
			topEmotion: null,
		} as const;
		expect(detailLine(none)).toBe("1 moment");
		expect(detailLine({ ...none, topEmotion: "self-doubt" })).toBe(
			"1 moment · Self doubt"
		);
		expect(detailLine({ ...none, ended: "same", topDomain: "health" })).toBe(
			"1 moment · Health · about the same"
		);
		expect(detailLine({ ...none, ended: "heavier" })).toBe(
			"1 moment · ended heavier"
		);
	});

	it("names every domain the server can send in one word", () => {
		const keys = Object.keys(COPY.week.domains);
		expect([...keys].sort()).toEqual(
			Object.keys(COPY.steadiness.domains).sort()
		);
		for (const key of keys) {
			const name = COPY.week.domains[key as DetailDomain];
			expect(name).toMatch(/^\S+$/);
			expect(detailLine({ ...TUESDAY, topDomain: key })).toContain(name);
		}
	});

	describe("at larger text sizes", () => {
		const ENDED = COPY.week.ended.lighter;
		const parts = (scale: number) =>
			(detailLine(TUESDAY, scale) ?? "").split(" · ");

		it("keeps the domain up to its threshold and drops it above", () => {
			for (const scale of [0.82, 1, DROP_DOMAIN_ABOVE]) {
				expect(parts(scale)).toEqual(["2 moments", "Work", "Overwhelm", ENDED]);
			}
			for (const scale of [DROP_DOMAIN_ABOVE + 0.01, 1.118, 1.235, 1.353]) {
				expect(parts(scale)).toEqual(["2 moments", "Overwhelm", ENDED]);
			}
		});

		it("drops the feeling too at accessibility sizes", () => {
			expect(parts(DROP_FEELING_ABOVE)).toEqual([
				"2 moments",
				"Overwhelm",
				ENDED,
			]);
			for (const scale of [DROP_FEELING_ABOVE + 0.01, 1.786, 1.8, 3.1]) {
				expect(parts(scale)).toEqual(["2 moments", ENDED]);
			}
		});

		it("always ends on how the day ended, at every size", () => {
			for (let scale = 0.8; scale <= 3.2; scale += 0.05) {
				expect(parts(scale).at(-1)).toBe(ENDED);
				expect(parts(scale)[0]).toBe("2 moments");
			}
		});

		it("passes the size through the held readout", () => {
			const days = BOARD.map((d, i) =>
				i === 1 ? { ...d, detail: TUESDAY } : d
			);
			const start = new Date(Date.UTC(2026, 10, 9));
			const at = (fontScale: number) =>
				heldReadout({
					days,
					fontScale,
					index: 1,
					start,
					todayIndex: 3,
					usual: USUAL,
				}).caption;
			expect(at(1)).toBe("2 moments · Work · Overwhelm · ended lighter");
			expect(at(1.235)).toBe("2 moments · Overwhelm · ended lighter");
		});
	});

	it("skips a domain it has no name for", () => {
		expect(detailLine({ ...TUESDAY, topDomain: "constructor" })).toBe(
			"2 moments · Overwhelm · ended lighter"
		);
	});
});

describe("weekA11y", () => {
	it("reads every day against your usual, naming today", () => {
		expect(weekA11y(BOARD, USUAL)).toBe(
			"Intensity by day. Monday, within your usual. Tuesday, above your usual. Wednesday, within your usual. Thursday, today, below your usual. Friday, still ahead. Saturday, still ahead. Sunday, still ahead"
		);
	});

	it("says the level without a usual, and reads an empty week", () => {
		const past = week([7.6, null, null, null, null, null, null], -1);
		expect(weekA11y(past, null)).toBe(
			"Intensity by day. Monday, high intensity. Tuesday, no moments. Wednesday, no moments. Thursday, no moments. Friday, no moments. Saturday, no moments. Sunday, no moments"
		);
		const monday = week(new Array<number | null>(7).fill(null), 0);
		expect(weekA11y(monday, USUAL)).toMatch(
			/^Intensity by day\. Monday, today, no moments\. Tuesday, still ahead/
		);
	});
});
