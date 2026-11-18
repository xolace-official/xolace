/** Intake's Xolace+ first look on fixtures: `xolace://dev/intake/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { saidWords } from "../first-look-model";
import { FixtureFirstLook } from "./fixture-first-look";
import { NO_PLANS, OFFERS_USED, TRIAL_ONLY } from "./sample-plans";

/** Intake's routes have no header. */
const OPTIONS = { headerShown: false };
const LONG =
	"I keep going over the same conversation with my sister and I can't stop replaying it";

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "first-look",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook />,
		title: "First look: the arrival, live",
	},
	{
		id: "first-look-arriving",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{ at: 480 }} />,
		title: "First look: mid-arrival, held",
	},
	{
		id: "first-look-settled",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} />,
		title: "First look: settled, Talk open",
	},
	{
		id: "first-look-support",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{ open: "sup" }} />,
		title: "First look: Support open",
	},
	{
		id: "first-look-building",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{ open: "ste" }} />,
		title: "First look: What’s building open",
	},
	{
		id: "first-look-voices",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{ open: "you", voice: "vesper" }} />,
		title: "First look: Vesper picked",
	},
	{
		id: "first-look-closed",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{ open: null }} />,
		title: "First look: every row closed",
	},
	{
		id: "first-look-plain",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} said={null} />,
		title: "First look: skipped, the plain line",
	},
	{
		id: "first-look-long-words",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} said={saidWords(LONG)} />,
		title: "First look: a long answer, cut",
	},
	{
		id: "first-look-monthly",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} plan="monthly" />,
		title: "First look: monthly discount picked",
	},
	{
		id: "first-look-trial-only",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} plans={TRIAL_ONLY} />,
		title: "First look: free week, plain monthly",
	},
	{
		id: "first-look-offers-used",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} plans={OFFERS_USED} />,
		title: "First look: offers already used",
	},
	{
		id: "first-look-buying",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook buying hold={{}} />,
		title: "First look: buying, the spinner",
	},
	{
		id: "first-look-unavailable",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} plans={NO_PLANS} unavailable />,
		title: "First look: plans didn’t load",
	},
	{
		id: "first-look-owned",
		options: OPTIONS,
		Screen: () => <FixtureFirstLook hold={{}} owned />,
		title: "First look: Xolace+ already theirs",
	},
];
