/** First run on fixtures: `xolace://dev/first-run/<id>`. Ages are ms; held states stand still. */

import type { ComponentProps } from "react";
import type { DevState } from "@/dev/dev-state";
import { FixtureFirstRun } from "@/features/first-run/dev/fixture-first-run";

/** First run draws its own screen, edge to edge. */
const OPTIONS = { headerShown: false };
const show = (props: ComponentProps<typeof FixtureFirstRun>) => () => (
	<FixtureFirstRun {...props} />
);
/** Story beat `i` held at `at` ms. */
const beat = (i: number, at: number) =>
	show({ scene: { story: { at, beat: i } }, start: "story" });
/** The seat with a sign-in held at `aa` ms on the board's clock (1100 back, 1800 seated). */
const signing = (auth: "apple" | "google", aa: number) =>
	show({ scene: { story: { aa, at: 1500, auth } }, start: "seat" });

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "promise",
		options: OPTIONS,
		Screen: show({ outcome: "signed-in" }),
		title: "Promise, live through to seated",
	},
	{
		id: "promise-opening",
		options: OPTIONS,
		Screen: show({ scene: { promise: { at: 1000 } } }),
		title: "Promise, the words arriving (1 s)",
	},
	{
		id: "promise-settled",
		options: OPTIONS,
		Screen: show({ scene: { promise: { at: 3500 } } }),
		title: "Promise, settled",
	},
	{
		id: "promise-day",
		options: OPTIONS,
		Screen: show({ day: true, scene: { promise: { at: 3500 } } }),
		title: "Promise, day",
	},
	{
		id: "promise-dusk",
		options: OPTIONS,
		Screen: show({ day: false, scene: { promise: { at: 3500 } } }),
		title: "Promise, dusk",
	},
	{
		id: "promise-named",
		options: OPTIONS,
		Screen: show({ scene: { promise: { at: 3500, namedAt: 900 } } }),
		title: "Promise, a mood named",
	},
	{
		id: "promise-handoff",
		options: OPTIONS,
		Screen: show({ scene: { promise: { at: 3500, handoffAt: 560 } } }),
		title: "Promise, the button dropping into the fire",
	},
	{
		id: "promise-reduced",
		options: OPTIONS,
		Screen: show({ reduced: true }),
		title: "Promise, Reduce Motion",
	},
	{
		id: "story",
		options: OPTIONS,
		Screen: show({ outcome: "signed-in", start: "story" }),
		title: "Story, live from the first beat",
	},
	{
		id: "beat-cover",
		options: OPTIONS,
		Screen: beat(0, 3000),
		title: "Story 1: the cover",
	},
	{
		id: "beat-mirror",
		options: OPTIONS,
		Screen: beat(1, 3500),
		title: "Story 2: the Mirror",
	},
	{
		id: "beat-vent",
		options: OPTIONS,
		Screen: beat(2, 3000),
		title: "Story 3: Vent",
	},
	{
		id: "beat-week",
		options: OPTIONS,
		Screen: beat(3, 3600),
		title: "Story 4: this week",
	},
	{
		id: "beat-xolacers",
		options: OPTIONS,
		Screen: beat(4, 3000),
		title: "Story 5: Xolacers",
	},
	{
		id: "beat-plus-close",
		options: OPTIONS,
		Screen: beat(5, 2400),
		title: "Story 6: Xolace+, inside the words",
	},
	{
		id: "beat-plus",
		options: OPTIONS,
		Screen: beat(5, 6000),
		title: "Story 6: Xolace+, stepped back",
	},
	{
		id: "story-reduced",
		options: OPTIONS,
		Screen: show({ reduced: true, start: "story" }),
		title: "Story, Reduce Motion",
	},
	{
		id: "seat",
		options: OPTIONS,
		Screen: show({ outcome: "signed-in", start: "seat" }),
		title: "Seat, live: a tap signs in after 1.2 s",
	},
	{
		id: "seat-held",
		options: OPTIONS,
		Screen: show({ scene: { story: { at: 1500 } }, start: "seat" }),
		title: "Seat, settled",
	},
	{
		id: "signing-in-apple",
		options: OPTIONS,
		Screen: signing("apple", 600),
		title: "Seat, signing in with Apple (spinner)",
	},
	{
		id: "signing-in-google",
		options: OPTIONS,
		Screen: signing("google", 600),
		title: "Seat, signing in with Google (spinner)",
	},
	{
		id: "signed-in-coal",
		options: OPTIONS,
		Screen: signing("apple", 1450),
		title: "Seat, signed in: the coal on its way",
	},
	{
		id: "seated",
		options: OPTIONS,
		Screen: signing("apple", 2600),
		title: "Seat, seated",
	},
	{
		id: "sign-in-cancelled",
		options: OPTIONS,
		Screen: show({ outcome: "cancelled", start: "seat" }),
		title: "Seat: a tap backs out of the sheet",
	},
	{
		id: "sign-in-failed",
		options: OPTIONS,
		Screen: show({ outcome: "failed", start: "seat" }),
		title: "Seat: a tap fails (the app also toasts)",
	},
	{
		id: "seat-waiting",
		options: OPTIONS,
		Screen: show({ start: "seat" }),
		title: "Seat: a sheet that never comes back",
	},
	{
		id: "seat-reduced",
		options: OPTIONS,
		Screen: show({ outcome: "signed-in", reduced: true, start: "seat" }),
		title: "Seat, Reduce Motion",
	},
];
