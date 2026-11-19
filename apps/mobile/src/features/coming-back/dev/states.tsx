/**
 * Coming back on fixtures: `xolace://dev/coming-back/<id>`, one per render in the prototype's
 * `design/return-v2/` (01–20, numbered in the titles), plus each away tier. The greeting and the
 * check-in open pushed, drawing their own scrim and paper.
 */
import type { ComponentProps } from "react";
import type { DevState } from "@/dev/dev-state";
import { NO_OUTCOMES } from "@/features/coming-back/coming-back-model";
import { FixtureCheckIn } from "@/features/coming-back/dev/fixture-check-in";
import { FixtureGreeting } from "@/features/coming-back/dev/fixture-greeting";
import {
	FixtureBanner,
	FixturePill,
} from "@/features/coming-back/dev/fixture-pill";
import {
	FIXTURE_EVENT,
	fixtureItems,
	LIGHTER_DONE,
} from "@/features/coming-back/dev/fixtures";

const OPTIONS = { headerShown: false };

type Entry = Omit<DevState, "id">;

const greeting = (
	title: string,
	props: ComponentProps<typeof FixtureGreeting> = {}
): Entry => ({
	options: OPTIONS,
	Screen: () => <FixtureGreeting {...props} />,
	title,
});

const checkIn = (
	title: string,
	props: ComponentProps<typeof FixtureCheckIn> = {}
): Entry => ({
	options: OPTIONS,
	Screen: () => <FixtureCheckIn {...props} />,
	title,
});

const pill = (title: string, ck: boolean, pm: boolean): Entry => ({
	options: OPTIONS,
	Screen: () => <FixturePill ck={ck} pm={pm} />,
	title,
});

const NOTHING_ELSE = { card: null, freeze: null } as const;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "greeting",
		...greeting("01 · Greeting, arriving (a few days)", { enter: true }),
	},
	{ id: "greeting-rest", ...greeting("02 · Greeting at rest") },
	{ id: "check-in", ...checkIn("03 · Check-in") },
	{ id: "lighter", ...checkIn("04 · Feeling lighter", { picked: "lighter" }) },
	{
		id: "back-one-done",
		...greeting("05 · Back on the greeting, the check-in ticks", {
			outcomes: LIGHTER_DONE,
			tick: "ck",
		}),
	},
	{
		id: "prompt",
		...greeting("06 · This month’s prompt, inside the card", {
			page: "prompt",
		}),
	},
	{
		id: "both-done",
		...greeting("07 · Both done", {
			outcomes: { ...LIGHTER_DONE, prompt: "read" },
			tick: "pm",
		}),
	},
	{
		id: "pill-prompt",
		...pill("08 · Later: the prompt is still here", false, true),
	},
	{ id: "pill-two", ...pill("09 · Later: 2 things", true, true) },
	{
		id: "pill-check-in",
		...pill("Later: the check-in is still here", true, false),
	},
	{
		id: "still-here",
		...greeting("10 · Reopened: Still here.", {
			enter: true,
			items: fixtureItems(NOTHING_ELSE),
			mode: "left",
		}),
	},
	{
		id: "still-here-two",
		...greeting("11 · Reopened with both waiting", {
			enter: true,
			items: fixtureItems({ freeze: null }),
			mode: "left",
		}),
	},
	{
		id: "let-it-pass",
		...greeting("13 · Let it pass", {
			outcomes: { ...NO_OUTCOMES, prompt: "passed" },
			tick: "pm",
		}),
	},
	{
		id: "next-day",
		...greeting("14 · Next day: Hi again", {
			away: "next",
			enter: true,
			items: fixtureItems({ day: "yesterday", event: null, freeze: null }),
		}),
	},
	{
		id: "next-day-prompt",
		...greeting("Next day: only the prompt", {
			away: "next",
			items: fixtureItems(NOTHING_ELSE),
		}),
	},
	{
		id: "away-14-30",
		...greeting("A couple of weeks away", {
			away: "away-14-30",
			items: fixtureItems({ freeze: null }),
		}),
	},
	{
		id: "away-30-90",
		...greeting("15 · A month away", {
			away: "away-30-90",
			enter: true,
			items: fixtureItems(NOTHING_ELSE),
		}),
	},
	{
		id: "away-90-plus",
		...greeting("Months away, nothing waiting", {
			away: "away-90-plus",
			items: fixtureItems({ ...NOTHING_ELSE, event: null }),
		}),
	},
	{
		id: "anniversary",
		...greeting("One year on", {
			away: "anniversary",
			items: fixtureItems(NOTHING_ELSE),
		}),
	},
	{
		id: "acute",
		...greeting("16 · Acute: the check-in first", {
			enter: true,
			items: fixtureItems({ tier: "acute" }),
		}),
	},
	{
		id: "acute-check-in",
		...checkIn("17 · Acute check-in", { tier: "acute" }),
	},
	{
		id: "still-sitting",
		...checkIn("18 · Still sitting with it", {
			picked: "still_here",
		}),
	},
	{ id: "heavier", ...checkIn("19 · Got heavier", { picked: "heavier" }) },
	{
		id: "processed",
		...checkIn("20 · I worked through it", { picked: "processed" }),
	},
	{
		id: "check-in-escalation",
		...checkIn("Check-in from an escalation (resources link)", {
			escalation: true,
		}),
	},
	{
		id: "prompt-no-line",
		...greeting("The prompt page, an event without a prompt line", {
			items: fixtureItems({
				event: {
					...FIXTURE_EVENT,
					linkUrl: undefined,
					sessionPrompt: undefined,
				},
			}),
			page: "prompt",
		}),
	},
	{
		id: "banner",
		options: OPTIONS,
		Screen: FixtureBanner,
		title: "You were reached (the in-app banner)",
	},
];
