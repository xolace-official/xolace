import { describe, expect, it } from "vitest";
import {
	arrivalPlan,
	isStreakMilestone,
	lastSevenDays,
	mayArrive,
	milestoneDayOf,
	milestoneLabel,
} from "@/features/achievements/arrival/arrival-model";
import {
	ARRIVAL_DAY,
	BACKFILL,
	DAY_7,
	DAY_30,
	ONE,
	TWO,
} from "@/features/achievements/dev/fixtures";

const NONE = new Set<string>();
const plan = (over: Partial<Parameters<typeof arrivalPlan>[0]>) =>
	arrivalPlan({
		opened: NONE,
		summary: null,
		today: ARRIVAL_DAY,
		unseen: [],
		...over,
	});

describe("streak milestones (production's 7, 30, 100, then every 100)", () => {
	it.each([7, 30, 100, 200, 1000])("%i is one", (day) => {
		expect(isStreakMilestone(day)).toBe(true);
	});

	it.each([3, 10, 14, 50, 150])("%i is not", (day) => {
		expect(isStreakMilestone(day)).toBe(false);
	});

	it("reads the day off a streak badge's id", () => {
		expect(milestoneDayOf("streak-30")).toBe(30);
		expect(milestoneDayOf("streak-10")).toBeNull();
		expect(milestoneDayOf("showing-up-100")).toBeNull();
	});
});

describe("lastSevenDays", () => {
	it("ends today (Monday 9 November 2026)", () => {
		expect(lastSevenDays(ARRIVAL_DAY, "en-GB")).toEqual([
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa",
			"Su",
			"Mo",
		]);
	});
});

describe("arrivalPlan", () => {
	it("is nothing when nothing is unseen", () => {
		expect(plan({})).toBeNull();
	});

	it("shows one badge with no milestone", () => {
		const p = plan({ unseen: ONE });
		expect(p).toMatchObject({ kind: "badges", milestone: null });
		expect(p?.kind === "badges" && p.badges.map((b) => b.title)).toEqual([
			"First quote saved",
		]);
	});

	it("keeps two badges in the order they were earned", () => {
		const p = plan({ unseen: TWO });
		expect(p?.kind === "badges" && p.badges.map((b) => b.family)).toEqual([
			"green",
			"aurora",
		]);
	});

	it("leads with the milestone and its streak badge on a milestone day", () => {
		const p = plan({ unseen: [...ONE, ...DAY_7] });
		expect(p?.kind === "badges" && p.badges[0]?.id).toBe("streak-7");
		expect(p?.kind === "badges" && p.milestone).toMatchObject({
			day: 7,
			freeze: "earned",
			from: 6,
			line: "A week. You made a week.",
		});
	});

	it("rolls 29 over to 30 with the month's line", () => {
		const p = plan({ unseen: DAY_30 });
		expect(p?.kind === "badges" && p.milestone).toMatchObject({
			day: 30,
			from: 29,
			line: "A month. You stayed.",
		});
	});

	it("puts the backfill summary first", () => {
		expect(plan({ summary: BACKFILL, unseen: ONE })?.kind).toBe("backfill");
	});

	it("leaves out what this run already showed", () => {
		const opened = new Set<string>([...BACKFILL.ids, ...ONE.map((b) => b.id)]);
		expect(plan({ opened, summary: BACKFILL, unseen: ONE })).toBeNull();
	});
});

describe("milestoneLabel", () => {
	it("is one sentence for VoiceOver", () => {
		const p = plan({ unseen: DAY_7 });
		if (p?.kind !== "badges" || !p.milestone) {
			throw new Error("expected a milestone");
		}
		expect(milestoneLabel(p.milestone)).toBe(
			"7 days in a row. A week. You made a week. You earned a freeze."
		);
	});
});

describe("mayArrive (the quiet-moment gate, #693)", () => {
	it("opens on a calm home screen and over ordinary screens", () => {
		expect(mayArrive({ homeBusy: false, pathname: "/" })).toBe(true);
		expect(mayArrive({ homeBusy: false, pathname: "/achievements" })).toBe(
			true
		);
		expect(mayArrive({ homeBusy: true, pathname: "/today" })).toBe(true);
	});

	it("waits while home is busy", () => {
		expect(mayArrive({ homeBusy: true, pathname: "/" })).toBe(false);
	});

	it.each([
		"/crisis-resources/call",
		"/voice-vent",
		"/talk",
		"/session-end",
		"/chat/conversation_1",
		"/follow-up",
		"/browse-player",
	])("never interrupts %s", (pathname) => {
		expect(mayArrive({ homeBusy: false, pathname })).toBe(false);
	});
});
