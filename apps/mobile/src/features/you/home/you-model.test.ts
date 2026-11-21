import { describe, expect, it } from "vitest";
import { fixtureYou } from "@/features/you/home/dev/fixture-state";
import {
	FIXTURE_NOW,
	fixtureRank,
	fixtureShelf,
	fixtureSummary,
} from "@/features/you/home/dev/fixtures";
import {
	badgesRowView,
	chipsView,
	freezeCopy,
	headerLoaded,
	heroView,
	patternRows,
	rankView,
	streakView,
} from "@/features/you/home/you-model";

describe("heroView", () => {
	it("greets by the hour and says since when", () => {
		expect(heroView(fixtureSummary("regular"), FIXTURE_NOW)).toEqual({
			greeting: "Evening, Ama",
			isNew: false,
			name: "Ama",
			since: "By the fire since July",
		});
	});

	it("names the year once it isn't this one", () => {
		const later = new Date(2027, 1, 3, 9, 0);
		expect(heroView(fixtureSummary("regular"), later)).toMatchObject({
			greeting: "Morning, Ama",
			since: "By the fire since July 2026",
		});
	});

	it("welcomes someone with no moments yet", () => {
		const late = new Date(2026, 10, 12, 23, 30);
		expect(heroView(fixtureSummary("new"), late)).toMatchObject({
			greeting: "Quiet hours, Ama",
			isNew: true,
			since: null,
		});
	});
});

describe("streakView", () => {
	it("leads with the run, best only when it beats it, the usual day from 5 moments", () => {
		expect(streakView(fixtureSummary("regular"))).toEqual({
			best: 21,
			freezes: 1,
			label: "12 days in a row, best 21",
			moments: 38,
			momentsLabel: "moments",
			streak: 12,
			usualDay: "Tue",
		});
	});

	it("never says 0 for an ended streak", () => {
		expect(streakView(fixtureSummary("ended"))).toMatchObject({
			label: "Your next streak starts today",
			streak: 0,
		});
	});

	it("says one day, not one days", () => {
		const summary = { ...fixtureSummary("regular"), currentStreak: 1 };
		expect(streakView(summary)?.label).toBe("1 day in a row, best 21");
	});

	it("hides the best when it's the current run", () => {
		const summary = { ...fixtureSummary("regular"), longestStreak: 12 };
		expect(streakView(summary)?.best).toBeNull();
		expect(streakView(summary)?.label).toBe("12 days in a row");
	});

	it("dashes the usual day under 5 moments", () => {
		const summary = { ...fixtureSummary("regular"), sessionCount: 4 };
		expect(streakView(summary)?.usualDay).toBe("—");
	});

	it("shows nothing before a moment, unless a freeze was earned another way", () => {
		const summary = fixtureSummary("new");
		expect(streakView(summary)).toBeNull();
		expect(streakView({ ...summary, streakFreezes: 1 })).not.toBeNull();
	});
});

describe("freezeCopy", () => {
	it("says what one does while the streak is lit", () => {
		expect(freezeCopy(1, true)).toEqual({
			hint: "Each one covers a missed day.",
			label: "1 freeze ready",
		});
	});

	it("names the cap once it's reached", () => {
		expect(freezeCopy(2, true).hint).toBe(
			"Each one covers a missed day. Max 2 on hand."
		);
	});

	it("keeps them for the next streak, and says how one is earned", () => {
		expect(freezeCopy(1, false)).toEqual({
			hint: "Saved for your next streak.",
			label: "1 freeze on hand",
		});
		expect(freezeCopy(0, false)).toEqual({
			hint: "Earn one every 7 days in a row.",
			label: "No freezes on hand",
		});
	});
});

describe("badgesRowView", () => {
	it("stacks the first three, pinned first, with the sparks and a freeze's price", () => {
		const row = badgesRowView(fixtureShelf("regular", "many", 1));
		expect(row).toMatchObject({
			count: 9,
			star: false,
			sub: "340 sparks · a freeze costs 50",
			title: "9 badges",
		});
		expect(row.medals.map((m) => m.id)).toEqual([
			"streak-10",
			"first-explore",
			"streak-5",
		]);
	});

	it("draws the star for exactly one badge, named", () => {
		expect(badgesRowView(fixtureShelf("new", "one", 0))).toMatchObject({
			star: true,
			sub: "You joined · 10 sparks",
			title: "1 badge",
		});
	});
});

describe("insights gates", () => {
	it("shows chips from the first moment", () => {
		expect(chipsView(fixtureSummary("regular"))).toEqual([
			"tired",
			"overwhelmed",
			"hopeful",
		]);
		expect(chipsView(fixtureSummary("new"))).toEqual([]);
	});

	it("shows patterns from 3 moments and the rhythm from 5", () => {
		const evening = { dayOfWeek: 2, hourOfDay: 19 };
		expect(patternRows(2, "lighter", evening)).toEqual([]);
		expect(patternRows(3, "lighter", evening).map((r) => r.text)).toEqual([
			"Most of your sessions end lighter.",
		]);
		expect(patternRows(5, "lighter", evening).map((r) => r.text)).toEqual([
			"Most of your sessions end lighter.",
			"You arrive most on Tuesday evenings.",
		]);
	});

	it("leaves out a mood with too little to say", () => {
		expect(patternRows(5, null, { dayOfWeek: 0, hourOfDay: 2 })).toEqual([
			{
				icon: { android: "moon_stars", ios: "moon.stars" },
				text: "You arrive most on Sunday late nights.",
			},
		]);
	});
});

describe("rankView", () => {
	it("gives the percentile once ranked", () => {
		expect(rankView(fixtureRank("regular"))).toEqual({
			foot: "38 moments you didn't look away from.",
			line: "of campers here reflect less than you.",
			pct: "64%",
		});
	});

	it("names what it's waiting for", () => {
		expect(rankView(fixtureRank("new")).foot).toBe(
			"Lights up after 5 moments. Your first one starts it."
		);
		expect(
			rankView({
				remaining: 2,
				sessionCount: 3,
				status: "pending",
				threshold: 5,
			}).foot
		).toBe("Lights up after 5 moments — 2 to go.");
		expect(rankView({ sessionCount: 9, status: "warming" })).toEqual({
			foot: "You're ready. Waiting on a few more people around the fire.",
			line: "Where you sit among everyone who reflects here.",
			pct: null,
		});
	});
});

describe("the fixture tab", () => {
	it("hides the cards someone took off", () => {
		const { state } = fixtureYou({ hidden: ["calendar", "rank"] });
		expect(state.days).toBeNull();
		expect(state.rank).toBeNull();
	});

	it("offers the Xolace+ row only to free users", () => {
		expect(fixtureYou({ plus: true }).state.plusRow).toBe(false);
		expect(fixtureYou({ plus: false }).state.plusRow).toBe(true);
	});
});

describe("headerLoaded", () => {
	const { state } = fixtureYou({ plus: false });

	it("waits for the hero, the streak and the badges row", () => {
		expect(headerLoaded(state)).toBe(true);
		expect(headerLoaded({ ...state, hero: undefined })).toBe(false);
		expect(headerLoaded({ ...state, streak: undefined })).toBe(false);
		expect(headerLoaded({ ...state, badges: undefined })).toBe(false);
	});

	it("counts no streak as loaded", () => {
		expect(headerLoaded({ ...state, streak: null })).toBe(true);
	});
});
