import { isStreakMilestone } from "@xolace/backend/shared";
import { describe, expect, it } from "vitest";
import {
	arrivalPlan,
	lastSevenDays,
	mayArrive,
	milestoneDayOf,
	milestoneLabel,
	milestoneWeek,
	type UnseenBadge,
} from "@/features/achievements/arrival/arrival-model";
import {
	ARRIVAL_DAY,
	BACKFILL,
	DAY_7,
	DAY_7_BEFORE_B14,
	DAY_7_FREEZE,
	DAY_7_KEPT,
	DAY_7_NOTHING,
	DAY_30,
	ONE,
	TWO,
} from "@/features/achievements/dev/fixtures";

const NONE = new Set<string>();
const plan = (over: Partial<Parameters<typeof arrivalPlan>[0]>) =>
	arrivalPlan({
		opened: NONE,
		summary: null,
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
			from: 6,
			line: "A week. You made a week.",
		});
	});

	it("claims no card and lights no week for a badge from before B14 (#811 review)", () => {
		const p = plan({ unseen: DAY_7_BEFORE_B14 });
		expect(p?.kind === "badges" && p.milestone).toMatchObject({
			added: null,
			week: null,
		});
	});

	it("shows what the day added: a saver, a freeze, or no card (B14)", () => {
		const added = (unseen: readonly UnseenBadge[]) => {
			const p = plan({ unseen });
			return p?.kind === "badges" ? p.milestone?.added : undefined;
		};
		expect(added(DAY_7)).toBe("saver");
		expect(added(DAY_7_FREEZE)).toBe("freeze");
		expect(added(DAY_7_NOTHING)).toBeNull();
	});

	it("draws the recorded week, the milestone day last (B14)", () => {
		const p = plan({ unseen: DAY_7_NOTHING });
		const week = p?.kind === "badges" ? p.milestone?.week : null;
		expect(week).toHaveLength(7);
		expect(week?.every((d) => d.lit)).toBe(true);
	});

	it("letters the week from the milestone's own day, whatever today is", () => {
		expect(
			milestoneWeek(DAY_7[0]?.milestone, "en-GB")?.map((d) => d.letter)
		).toEqual(["Tu", "We", "Th", "Fr", "Sa", "Su", "Mo"]);
		expect(milestoneWeek(undefined)).toBeNull();
	});

	it("leaves a day a freeze kept unlit (B14)", () => {
		const p = plan({ unseen: DAY_7_KEPT });
		const week = p?.kind === "badges" ? p.milestone?.week : null;
		expect(week?.map((d) => d.lit)).toEqual([
			true,
			true,
			false,
			true,
			true,
			true,
			true,
		]);
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
	const milestone = () => {
		const p = plan({ unseen: DAY_7 });
		if (p?.kind !== "badges" || !p.milestone) {
			throw new Error("expected a milestone");
		}
		return p.milestone;
	};

	it("is one sentence for VoiceOver, saying nothing of a card it can't vouch for", () => {
		expect(milestoneLabel({ ...milestone(), added: null })).toBe(
			"7 days in a row. A week. You made a week."
		);
	});

	it("names what the day added once it's known", () => {
		expect(milestoneLabel(milestone())).toBe(
			"7 days in a row. A week. You made a week. You earned a streak saver."
		);
		expect(milestoneLabel({ ...milestone(), added: "freeze" })).toBe(
			"7 days in a row. A week. You made a week. You earned a freeze."
		);
	});
});

describe("mayArrive (the quiet-moment gate, #693)", () => {
	it("opens on a calm home screen and over ordinary screens", () => {
		expect(
			mayArrive({ homeBusy: false, pathname: "/today", presented: false })
		).toBe(true);
		expect(
			mayArrive({
				homeBusy: false,
				pathname: "/achievements",
				presented: false,
			})
		).toBe(true);
		expect(
			mayArrive({ homeBusy: true, pathname: "/explore", presented: false })
		).toBe(true);
	});

	it("waits while a native sheet or modal is up, wherever it is (#811 review)", () => {
		expect(
			mayArrive({ homeBusy: false, pathname: "/achievements", presented: true })
		).toBe(false);
	});

	it("waits while home or Reflect is busy", () => {
		for (const pathname of ["/today", "/reflect"]) {
			expect(mayArrive({ homeBusy: true, pathname, presented: false })).toBe(
				false
			);
		}
	});

	it.each([
		"/crisis-resources/call",
		"/voice-vent",
		"/talk",
		"/session-end",
		"/chat/conversation_1",
		"/check-in",
		"/player",
	])("never interrupts %s", (pathname) => {
		expect(mayArrive({ homeBusy: false, pathname, presented: false })).toBe(
			false
		);
	});
});
