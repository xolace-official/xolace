import type { DevState } from "@/dev/dev-state";
import { FixtureArrival } from "@/features/achievements/arrival/dev/fixture-arrival";
import {
	DAY_7,
	DAY_7_BEFORE_B14,
	DAY_7_FREEZE,
	DAY_7_KEPT,
	DAY_7_NOTHING,
	DAY_30,
	ONE,
	TWO,
} from "@/features/achievements/dev/fixtures";

const OPTIONS = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "arrival-one",
		options: OPTIONS,
		Screen: () => <FixtureArrival unseen={ONE} />,
		title: "A badge arrives: First quote saved",
	},
	{
		id: "arrival-one-burst",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 1100 }} unseen={ONE} />,
		title: "A badge arrives, 1.1 s: the burst",
	},
	{
		id: "arrival-one-fall",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 2600 }} unseen={ONE} />,
		title: "A badge arrives, 2.6 s: the fall and the hint",
	},
	{
		id: "arrival-turned",
		options: OPTIONS,
		Screen: () => (
			<FixtureArrival still={{ at: 6000, turned: true }} unseen={ONE} />
		),
		title: "A badge arrives, turned over",
	},
	{
		id: "arrival-two",
		options: OPTIONS,
		Screen: () => <FixtureArrival unseen={TWO} />,
		title: "Two badges, Next between them",
	},
	{
		id: "arrival-two-next",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 320, step: 1 }} unseen={TWO} />,
		title: "Two badges, Next at 320 ms",
	},
	{
		id: "milestone-7",
		options: OPTIONS,
		Screen: () => <FixtureArrival unseen={DAY_7} />,
		title: "Day 7: the milestone, then its badge",
	},
	{
		id: "milestone-7-400",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 400 }} unseen={DAY_7} />,
		title: "Day 7, 400 ms: Flux, the glow, the unlit 6",
	},
	{
		id: "milestone-7-1200",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 1200 }} unseen={DAY_7} />,
		title: "Day 7, 1.2 s: rolled to 7, the ring of sparks",
	},
	{
		id: "milestone-7-3000",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 3000 }} unseen={DAY_7} />,
		title: "Day 7, 3 s: lifted, the days lighting",
	},
	{
		id: "milestone-7-settled",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 5000 }} unseen={DAY_7} />,
		title: "Day 7, settled: the week, a streak saver, Next",
	},
	{
		id: "milestone-7-next",
		options: OPTIONS,
		Screen: () => (
			<FixtureArrival still={{ at: 350, next: true }} unseen={DAY_7} />
		),
		title: "Day 7, Next at 350 ms: the badge drops over the fire",
	},
	{
		id: "milestone-7-badge",
		options: OPTIONS,
		Screen: () => (
			<FixtureArrival still={{ at: 1300, next: true }} unseen={DAY_7} />
		),
		title: "Day 7's badge, 1.3 s: the burst and the fall",
	},
	{
		id: "milestone-freeze",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 5000 }} unseen={DAY_7_FREEZE} />,
		title: "Day 7, a saver already held: it added a freeze",
	},
	{
		id: "milestone-nothing",
		options: OPTIONS,
		Screen: () => (
			<FixtureArrival still={{ at: 5000 }} unseen={DAY_7_NOTHING} />
		),
		title: "Day 7, saver and freezes full: the week, no card",
	},
	{
		id: "milestone-kept-day",
		options: OPTIONS,
		Screen: () => <FixtureArrival still={{ at: 5000 }} unseen={DAY_7_KEPT} />,
		title: "Day 7 with a day a freeze kept: that day unlit",
	},
	{
		id: "milestone-7-live",
		options: OPTIONS,
		Screen: () => (
			<FixtureArrival still={{ at: 5000 }} unseen={DAY_7_BEFORE_B14} />
		),
		title: "Day 7 earned before B14: no week or card",
	},
	{
		id: "milestone-30",
		options: OPTIONS,
		Screen: () => <FixtureArrival unseen={DAY_30} />,
		title: "Day 30: 29 rolls to 30",
	},
	{
		id: "backfill",
		options: OPTIONS,
		Screen: () => <FixtureArrival backfill />,
		title: "Badges are here: what was already earned",
	},
];
