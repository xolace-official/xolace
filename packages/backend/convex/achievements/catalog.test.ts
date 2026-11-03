import { describe, expect, it } from "vitest";
import {
	ACHIEVEMENT_CATEGORIES,
	BADGE_ART_KEYS,
	FIXED_ACHIEVEMENTS,
	findAchievement,
	isStreakRung,
} from "./catalog";

describe("streak rungs (#683)", () => {
	it("are dense early, every 10 to 100, every 20 to 200, then every 30", () => {
		const rungs = Array.from({ length: 300 }, (_, i) => i + 1).filter(
			isStreakRung
		);
		expect(rungs).toEqual([
			3, 5, 7, 10, 14, 21, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180,
			200, 230, 260, 290,
		]);
	});

	it("add a yearly rung that the every-30 rule never lands on", () => {
		expect(isStreakRung(350)).toBe(true);
		expect(isStreakRung(360)).toBe(false);
		expect(isStreakRung(365)).toBe(true);
		expect(isStreakRung(380)).toBe(true);
		expect(isStreakRung(730)).toBe(true);
		expect(isStreakRung(1095)).toBe(true);
	});

	it("award sparks sized by how long the run is", () => {
		const sparks = (n: number) => findAchievement(`streak-${n}`)?.sparks;
		expect([3, 5, 7].map(sparks)).toEqual([10, 10, 10]);
		expect([10, 14, 21, 30].map(sparks)).toEqual([25, 25, 25, 25]);
		expect([40, 100].map(sparks)).toEqual([50, 50]);
		expect([120, 200, 230, 365, 1460].map(sparks)).toEqual([
			100, 100, 100, 100, 100,
		]);
	});

	it("are titled by days, and by years on the yearly rungs", () => {
		expect(findAchievement("streak-30")?.title).toBe("30 days by the fire");
		expect(findAchievement("streak-260")?.title).toBe("260 days by the fire");
		expect(findAchievement("streak-365")?.title).toBe("A year by the fire");
		expect(findAchievement("streak-1095")?.title).toBe("3 years by the fire");
	});

	it("reuse the streak-milestone copy at 7, 30 and 100", () => {
		expect(findAchievement("streak-7")?.copy).toBe(
			"7 days by the fire. The flame's holding steady."
		);
		expect(findAchievement("streak-30")?.copy).toBe(
			"30 days. This is a rhythm now."
		);
		expect(findAchievement("streak-40")?.copy).toBe("40 days. Still here.");
	});

	it("is not an achievement off the ladder", () => {
		expect(findAchievement("streak-4")).toBeUndefined();
		expect(findAchievement("streak-0")).toBeUndefined();
		expect(findAchievement("streak-abc")).toBeUndefined();
		expect(findAchievement("streak-030")).toBeUndefined();
	});
});

describe("streak artKeys (#687)", () => {
	const artKey = (n: number) => findAchievement(`streak-${n}`)?.artKey;

	it("give each fire stage 1…n pips", () => {
		expect([3, 5, 7].map(artKey)).toEqual([
			"streak-spark-1",
			"streak-spark-2",
			"streak-spark-3",
		]);
		expect([10, 21, 30, 60, 70, 90, 100, 180].map(artKey)).toEqual([
			"streak-kindling-1",
			"streak-kindling-3",
			"streak-campfire-1",
			"streak-campfire-4",
			"streak-moon-1",
			"streak-moon-3",
			"streak-hearth-1",
			"streak-hearth-5",
		]);
	});

	it("share the bonfire from 200 on", () => {
		expect([200, 230, 260, 1430, 1490].map(artKey)).toEqual(
			Array(5).fill("streak-bonfire")
		);
	});

	it("give year k its own art, capped at five years", () => {
		expect([365, 730, 1460, 1825, 2190, 3650].map(artKey)).toEqual([
			"streak-year-1",
			"streak-year-2",
			"streak-year-4",
			"streak-year-5",
			"streak-year-5",
			"streak-year-5",
		]);
	});
});

describe("launch catalog (#683, #687)", () => {
	it("lists the five categories in screen order", () => {
		expect(ACHIEVEMENT_CATEGORIES.map((c) => c.title)).toEqual([
			"Getting started",
			"Streak",
			"Showing up",
			"Exploring",
			"Understanding",
		]);
	});

	it("holds every fixed launch achievement, with the badge-subject ids and sparks", () => {
		expect(
			FIXED_ACHIEVEMENTS.map((a) => [a.category, a.achievementId, a.sparks])
		).toEqual([
			["getting_started", "joined", 10],
			["getting_started", "first-session", 10],
			["showing_up", "showing-up-5", 25],
			["showing_up", "showing-up-10", 25],
			["showing_up", "showing-up-25", 25],
			["showing_up", "showing-up-50", 50],
			["showing_up", "showing-up-100", 50],
			["showing_up", "showing-up-250", 100],
			["showing_up", "showing-up-500", 100],
			["showing_up", "showing-up-1000", 100],
			["exploring", "first-talk", 10],
			["exploring", "first-read", 10],
			["exploring", "read-5", 25],
			["exploring", "read-10", 25],
			["exploring", "read-25", 50],
			["exploring", "read-50", 50],
			["exploring", "first-quote", 10],
			["exploring", "sat-with-it", 10],
			["exploring", "first-exercise", 10],
			["exploring", "first-kindling", 10],
			["exploring", "asked-for-chat", 10],
			["exploring", "first-xolacer-chat", 10],
			["exploring", "shared-reflection", 10],
			["exploring", "first-listen", 10],
			["understanding", "understanding-1", 50],
			["understanding", "understanding-3", 50],
			["understanding", "understanding-8", 50],
		]);
	});

	it("uses the id as the artKey outside the streak", () => {
		for (const a of FIXED_ACHIEVEMENTS) {
			expect(a.artKey).toBe(a.achievementId);
		}
	});

	it("has no first check-in at launch", () => {
		expect(findAchievement("first-check-in")).toBeUndefined();
	});

	it("finds a fixed achievement by id", () => {
		expect(findAchievement("joined")).toMatchObject({
			sparks: 10,
			title: "Joined Xolace",
		});
	});
});

describe("badge art keys (#687, #690)", () => {
	it("name every image an achievement can show, so the upload script has a finite list", () => {
		const shown = new Set(FIXED_ACHIEVEMENTS.map((a) => a.artKey));
		// Ten years of streak covers every stage, the bonfire and every star count.
		for (let days = 1; days <= 3650; days++) {
			const art = findAchievement(`streak-${days}`)?.artKey;
			if (art) {
				shown.add(art);
			}
		}
		expect(new Set(BADGE_ART_KEYS)).toEqual(shown);
	});

	it("count 27 fixed images, 18 streak stage rungs, the bonfire and 5 yearly", () => {
		expect(BADGE_ART_KEYS).toHaveLength(51);
		expect(BADGE_ART_KEYS).toContain("streak-hearth-5");
		expect(BADGE_ART_KEYS).toContain("streak-year-5");
		expect(BADGE_ART_KEYS).not.toContain("streak-year-6");
	});
});
