import { describe, expect, it } from "vitest";
import {
	type InsightsView,
	litTicks,
	steadinessCard,
	TICKS,
} from "@/features/you/home/steadiness/steadiness-model";

const NOW = new Date(2026, 10, 12);
type D = InsightsView["domains"][number];
const work: D = {
	compounding: "compounding",
	domain: "work",
	lastSeenAt: null,
	state: "settled",
};
const health: D = {
	compounding: "easing",
	domain: "health",
	lastSeenAt: null,
	state: "unlocked",
};
const love: D = {
	compounding: null,
	domain: "love",
	lastSeenAt: null,
	state: "settled",
};
const self: D = { domain: "self", lastSeenAt: null, state: "warming" };

describe("steadinessCard", () => {
	it("draws Xolace+'s card: score, trend, and what it saw in each part", () => {
		const card = steadinessCard(
			{
				domains: [work, health, love, self],
				overall: 68,
				overallTrend: 4,
				overallTrendSince: null,
			},
			true,
			NOW
		);
		expect(card).toEqual({
			lit: true,
			parts: [
				{
					domain: "work",
					name: "Work & Studies",
					tone: "ember",
					word: "Heavier than your usual",
				},
				{
					domain: "health",
					name: "Health & Rest",
					tone: "ember",
					word: "Easing",
				},
				{
					domain: "love",
					name: "Love & Friendship",
					tone: "accent",
					word: "Known well",
				},
			],
			score: 68,
			trend: { kind: "shown", text: "Up 4 since last week" },
		});
	});

	it("gives free users the stage words and a locked trend", () => {
		const card = steadinessCard(
			{ domains: [work, health, self], overall: 68 },
			false,
			NOW
		);
		expect(card.lit && card.trend).toEqual({ kind: "locked" });
		expect(card.parts.map((p) => [p.word, p.tone])).toEqual([
			["Known well", "accent"],
			["Getting to know it", "accent"],
			["Warming up", "accent"],
		]);
	});

	it("hides the trend in a quiet week, and names a month when it runs from one", () => {
		const quiet = steadinessCard(
			{ domains: [work, love], overall: 50, overallTrend: null },
			true,
			NOW
		);
		expect(quiet.lit && quiet.trend).toBeNull();
		const since = steadinessCard(
			{
				domains: [work, love],
				overall: 50,
				overallTrend: -2.4,
				overallTrendSince: new Date(2026, 3, 2).getTime(),
			},
			true,
			NOW
		);
		expect(since.lit && since.trend).toEqual({
			kind: "shown",
			text: "Down 2 since April",
		});
		const flat = steadinessCard(
			{ domains: [work, love], overall: 50, overallTrend: 0.2 },
			true,
			NOW
		);
		expect(flat.lit && flat.trend).toEqual({
			kind: "shown",
			text: "Same as last week",
		});
	});

	it("mutes a quiet part", () => {
		const card = steadinessCard(
			{ domains: [{ ...love, lastSeenAt: 1 }], overall: null },
			true,
			NOW
		);
		expect(card.parts[0]).toMatchObject({
			tone: "muted",
			word: "Not recently",
		});
	});

	it("isn't lit before two known parts, and counts the one so far", () => {
		expect(
			steadinessCard(
				{ domains: [{ ...love, state: "unlocked" }, self], overall: null },
				false,
				NOW
			)
		).toEqual({
			known: 1,
			lit: false,
			parts: [
				{
					domain: "love",
					name: "Love & Friendship",
					tone: "accent",
					word: "Getting to know it",
				},
				{ domain: "self", name: "Self", tone: "accent", word: "Warming up" },
			],
		});
		const none = steadinessCard({ domains: [], overall: null }, false, NOW);
		expect(none).toEqual({ known: 0, lit: false, parts: [] });
	});

	it("counts a known part that has gone quiet, as the server does", () => {
		const quiet = {
			...love,
			lastSeenAt: NOW.getTime(),
			state: "unlocked" as const,
		};
		const card = steadinessCard(
			{ domains: [quiet, self], overall: null },
			false,
			NOW
		);
		expect(card.lit).toBe(false);
		expect(card.lit ? null : card.known).toBe(1);
	});
});

describe("litTicks", () => {
	it("fills the fan in proportion, clamped", () => {
		expect(litTicks(0)).toBe(0);
		expect(litTicks(100)).toBe(TICKS);
		expect(litTicks(68)).toBe(21);
		expect(litTicks(140)).toBe(TICKS);
	});
});
