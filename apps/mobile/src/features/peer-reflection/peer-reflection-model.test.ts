import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import { MATCH, RECENT } from "./dev/fixtures";
import {
	announcementOf,
	bridgeShows,
	cardsOf,
	firstOf,
	flipped,
	type Gone,
	liveCounts,
	othersOf,
	recount,
	resultsOf,
	wantsRecent,
} from "./peer-reflection-model";

describe("resultsOf", () => {
	it("loads until the match comes back", () => {
		expect(resultsOf(undefined, undefined)).toEqual({ status: "loading" });
	});

	it("shows the session's matches first", () => {
		expect(resultsOf(MATCH, undefined)).toEqual({
			rows: MATCH,
			set: "match",
			status: "ready",
		});
	});

	it("waits for recent ones when nothing matches", () => {
		expect(resultsOf([], undefined)).toEqual({ status: "loading" });
	});

	it("falls back to recent ones", () => {
		expect(resultsOf([], RECENT)).toMatchObject({
			rows: RECENT,
			set: "recent",
		});
	});

	it("is none yet when there are neither", () => {
		expect(resultsOf([], [])).toEqual({
			rows: [],
			set: "none",
			status: "ready",
		});
	});

	it("shows at most four", () => {
		const five = [...MATCH, { ...MATCH[0], _id: "m5" }];
		expect(resultsOf(five, undefined)).toMatchObject({ rows: MATCH });
	});
});

describe("firstOf", () => {
	it("keeps nothing while loading", () => {
		expect(firstOf({ status: "loading" }, {})).toBeNull();
	});

	it("keeps the first ready results", () => {
		expect(firstOf(resultsOf(MATCH, undefined), {})).toEqual({
			rows: MATCH,
			set: "match",
			status: "ready",
		});
	});

	it("leaves out reflections put away on an earlier visit", () => {
		const kept = firstOf(resultsOf(MATCH, undefined), {
			m2: "hidden",
			m4: "reported",
		});
		expect(kept?.rows.map((r) => r._id)).toEqual(["m1", "m3"]);
		expect(kept?.set).toBe("match");
	});

	it("is None yet when every one was put away", () => {
		const gone = Object.fromEntries(
			RECENT.map((r): [string, Gone] => [r._id, "hidden"])
		);
		expect(firstOf(resultsOf([], RECENT), gone)).toEqual({
			rows: [],
			set: "none",
			status: "ready",
		});
	});
});

describe("liveCounts", () => {
	const first = firstOf(resultsOf(MATCH, undefined), {})!;

	it("never reshuffles: a new match or a reflection leaving keeps the cards in place", () => {
		const shown = liveCounts(first, [MATCH[2], RECENT[0], MATCH[0]]);
		expect(shown.set).toBe("match");
		expect(shown.rows.map((r) => r._id)).toEqual(["m1", "m2", "m3", "m4"]);
	});

	it("still takes a card's live count by id", () => {
		expect(liveCounts(first, recount(MATCH, "m3", true)).rows[2]).toMatchObject(
			{ resonanceCount: 22 }
		);
	});

	it("holds through a reload", () => {
		expect(liveCounts(first, undefined, undefined).rows).toEqual(MATCH);
	});

	it("keeps a recent visit's counts live once a close match turns up", () => {
		const kept = firstOf(resultsOf([], RECENT), {})!;
		const later = recount(RECENT, RECENT[1]._id, true);
		const shown = liveCounts(kept, MATCH, later);
		expect(shown.set).toBe("recent");
		expect(shown.rows[1].resonanceCount).toBe(RECENT[1].resonanceCount + 1);
	});
});

describe("wantsRecent", () => {
	it("waits for the match", () => {
		expect(wantsRecent(null, undefined)).toBe(false);
	});

	it("asks once nothing matches", () => {
		expect(wantsRecent(null, [])).toBe(true);
	});

	it("skips when the session has matches", () => {
		expect(wantsRecent(null, MATCH)).toBe(false);
	});

	it("keeps asking while the visit shows recent ones, after a match turns up", () => {
		const kept = firstOf(resultsOf([], RECENT), {});
		expect(wantsRecent(kept, MATCH)).toBe(true);
	});
});

describe("othersOf (board youLabel: count − 1 once you're in)", () => {
	it("counts everyone before you've felt it", () => {
		expect(othersOf(12, false)).toBe(12);
	});

	it("leaves you out once you have", () => {
		expect(othersOf(13, true)).toBe(12);
	});

	it("never goes below none", () => {
		expect(othersOf(0, true)).toBe(0);
	});
});

describe("cardsOf", () => {
	it("joins rows, your answers and the cards put away", () => {
		const cards = cardsOf(
			recount(MATCH, "m1", true),
			{ m1: true },
			{ m2: "hidden" }
		);
		expect(cards[0]).toEqual({
			gone: null,
			id: "m1",
			on: true,
			others: 12,
			text: MATCH[0].displayText,
		});
		expect(cards[1]).toMatchObject({ gone: "hidden", on: false, others: 8 });
	});

	it("reads every card as off before the answers come in", () => {
		expect(cardsOf(MATCH, undefined, {}).every((c) => !c.on)).toBe(true);
	});
});

describe("the optimistic flip", () => {
	it("turns a card on and back off", () => {
		const on = flipped({}, "m1");
		expect(on).toEqual({ m1: true });
		expect(flipped(on, "m1")).toEqual({ m1: false });
	});

	it("moves the count with you, and keeps the label right through it", () => {
		const rows = recount(MATCH, "m1", true);
		expect(rows[0].resonanceCount).toBe(13);
		expect(othersOf(rows[0].resonanceCount, true)).toBe(12);
		expect(recount(rows, "m1", false)[0].resonanceCount).toBe(12);
	});
});

describe("copy", () => {
	it("says who else (board youLabel)", () => {
		expect(COPY.you(0)).toBe("You’re the first");
		expect(COPY.you(1)).toBe("You and 1 other");
		expect(COPY.you(12)).toBe("You and 12 others");
	});

	it("announces the set's title and how many", () => {
		expect(announcementOf("match", 4)).toBe(
			"Others have felt something like this. 4 reflections."
		);
		expect(announcementOf("recent", 1)).toBe(
			"Nothing quite like yours yet. 1 reflection."
		);
		expect(announcementOf("none", 0)).toBe(
			"You’re among the first. No one has shared something like this yet."
		);
	});
});

describe("bridgeShows", () => {
	it("shows only when session end will offer to leave yours", () => {
		expect(bridgeShows("It’s been a lot")).toBe(true);
		expect(bridgeShows("  ")).toBe(false);
		expect(bridgeShows(undefined)).toBe(false);
	});
});
