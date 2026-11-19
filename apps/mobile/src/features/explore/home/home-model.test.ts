import { describe, expect, it } from "vitest";
import {
	CONT,
	ENTRIES,
	FRESH,
	HOUR,
	SHORT,
} from "@/features/explore/dev/home-fixtures";
import {
	continueLabel,
	continueMeta,
	continueShare,
	fromShort,
	fromTrack,
	hourTitle,
	isLocked,
	itemLabel,
	itemMeta,
	pages,
	pickAt,
	pickPool,
	tileMeta,
} from "./home-model";

const [track, entry] = CONT;

describe("itemMeta", () => {
	it("says the family and the length of a track", () => {
		expect(itemMeta(fromTrack(HOUR.day[0]))).toMatch(
			/^Support audio · \d+ min$/
		);
	});

	it("says only the family when the shelf serves no length (New)", () => {
		expect(itemMeta(fromTrack(FRESH[0]))).toMatch(/^(Support audio|Music)$/);
	});

	it("reads an entry as Lantern, its kind and its reading time", () => {
		const it = fromShort({ entry: ENTRIES.yes, kind: "entry", plus: false });
		expect(itemMeta(it)).toBe("Lantern · Advice · 4 min read");
		expect(tileMeta(it)).toBe("Advice · 4 min read");
	});
});

describe("Continue", () => {
	it("says the minutes left, and Playing or Paused while it's loaded", () => {
		expect(continueMeta(track, null)).toBe("4 min left");
		expect(continueMeta(track, "playing")).toBe("Playing · 4 min left");
		expect(continueMeta(track, "paused")).toBe("Paused · 4 min left");
	});

	it("says how much of an entry is read", () => {
		expect(continueMeta(entry, null)).toBe("40% read");
	});

	it("shares how far through, 0 to 1", () => {
		expect(continueShare(entry)).toBe(0.4);
		const t = track.kind === "track" ? track : null;
		expect(continueShare(track)).toBeCloseTo(
			(t?.positionSec ?? 0) / (t?.track.durationSec ?? 1)
		);
	});

	it("adds the lock to a free listener's label on a track only", () => {
		expect(continueLabel(track, null, true)).toMatch(/, Xolace\+, locked$/);
		expect(continueLabel(entry, null, true)).not.toMatch(/locked/);
	});
});

describe("the lock", () => {
	it("is only a free listener's, and only on Xolace+", () => {
		expect(isLocked({ plus: true }, true)).toBe(true);
		expect(isLocked({ plus: true }, false)).toBe(false);
		expect(isLocked({ plus: false }, true)).toBe(false);
	});

	it("counts New's tracks, which carry no `plus`, as Xolace+", () => {
		const it = fromTrack(FRESH[0]);
		expect(it.plus).toBe(true);
		expect(itemLabel(it, itemMeta(it), true)).toMatch(/Xolace\+, locked$/);
	});
});

describe("For the hour", () => {
	it("titles each phase", () => {
		expect(hourTitle("dawn")).toBe("For this morning");
		expect(hourTitle("day")).toBe("For the day");
		expect(hourTitle("evening")).toBe("For this evening");
		expect(hourTitle("late")).toBe("For the small hours");
	});
});

describe("Choose for me", () => {
	it("takes the hour's tracks then the short shelf, each once", () => {
		const pool = pickPool(HOUR.day, [
			...SHORT,
			{ kind: "track", plus: true, track: HOUR.day[0] },
		]);
		const keys = pool.map((p) => p.key);
		expect(new Set(keys).size).toBe(keys.length);
		expect(keys.slice(0, HOUR.day.length)).toEqual(HOUR.day.map((t) => t._id));
	});

	it("walks the pool, so a pick never repeats twice in a row", () => {
		const pool = pickPool(HOUR.day, SHORT);
		expect(pickAt(pool, 0)?.key).not.toBe(pickAt(pool, 1)?.key);
		expect(pickAt(pool, pool.length)?.key).toBe(pickAt(pool, 0)?.key);
		expect(pickAt([], 3)).toBeNull();
	});
});

describe("pages", () => {
	it("splits into threes, the last one short", () => {
		expect(pages([1, 2, 3, 4, 5, 6, 7])).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
		expect(pages([])).toEqual([]);
	});
});
