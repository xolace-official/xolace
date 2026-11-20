import type { DevState } from "@/dev/dev-state";
import {
	InsightsUpsell,
	PartInFocus,
	XolacerSuggestion,
} from "./extras-screen";
import { FixtureScreen } from "./fixture-screen";
import {
	FREE,
	LATE,
	LISTEN,
	LISTENER,
	LOADING,
	NOTHING,
	STATE,
} from "./fixtures";
import { LetterWaiting, LetterWrite } from "./letter-screen";

const OPTIONS = { gestureEnabled: false, headerShown: false };
const LIGHTEST = 1;
const HEAVIEST = 0;
const HEAVIER = 0.2;
const A_LITTLE_LIGHTER = 0.62;
const SAME = 0.5;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "arriving",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ at: { clock: "c1", ms: 700 } }} state={STATE} />
		),
		title: "01 Arriving, 700 ms",
	},
	{
		id: "asking",
		options: OPTIONS,
		Screen: () => <FixtureScreen state={STATE} />,
		title: "02 Asking (arrives live)",
	},
	{
		id: "dragging",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen
				scene={{ grab: true, position: A_LITTLE_LIGHTER }}
				state={STATE}
			/>
		),
		title: "03 Dragging, a little lighter",
	},
	{
		id: "much-lighter",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ position: LIGHTEST }} state={STATE} />
		),
		title: "04 Much lighter",
	},
	{
		id: "much-heavier",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ position: HEAVIEST }} state={STATE} />
		),
		title: "05 Much heavier",
	},
	{
		id: "the-same",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ position: SAME }} state={STATE} />,
		title: "06 The same",
	},
	{
		id: "not-sure",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ unsure: true }} state={STATE} />,
		title: "07 Not sure",
	},
	{
		id: "follow-up",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ position: HEAVIER }} state={STATE} />,
		title: "08 Heavier: Continue opens the follow-up",
	},
	{
		id: "to-moment-2",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen
				scene={{ at: { clock: "c2", ms: 300 }, moment: 2 }}
				state={STATE}
			/>
		),
		title: "09 To moment 2, 300 ms",
	},
	{
		id: "leave-it",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={STATE} />,
		title: "10 Leave it for someone?",
	},
	{
		id: "holding",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ moment: 2, share: "hold" }} state={STATE} />
		),
		title: "11 Holding the card, ready",
	},
	{
		id: "in-flight",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen
				scene={{ at: { clock: "cs", ms: 900 }, moment: 2, share: "sent" }}
				state={STATE}
			/>
		),
		title: "12 The light in flight, 900 ms",
	},
	{
		id: "left",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ moment: 2, share: "sent" }} state={STATE} />
		),
		title: "13 Left for someone",
	},
	{
		id: "not-this-time",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ moment: 2, share: "kept" }} state={STATE} />
		),
		title: "14 Not this time",
	},
	{
		id: "free-pitch",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={FREE} />,
		title: "15 Free: the kindling pitch",
	},
	{
		id: "free-after-heavier",
		options: OPTIONS,
		Screen: () => (
			<FixtureScreen scene={{ moment: 2, position: HEAVIER }} state={FREE} />
		),
		title: "16 Free, after heavier: no slot",
	},
	{
		id: "listener",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={LISTENER} />,
		title: "17 A listener",
	},
	{
		id: "slot-loading",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={LOADING} />,
		title: "18 The slot loading (held)",
	},
	{
		id: "nothing-to-share",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={NOTHING} />,
		title: "19 Nothing to share",
	},
	{
		id: "late",
		options: OPTIONS,
		Screen: () => <FixtureScreen state={LATE} />,
		title: "20 Late, moment 1",
	},
	{
		id: "late-moment-2",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={LATE} />,
		title: "21 Late, moment 2",
	},
	{
		id: "listen",
		options: OPTIONS,
		Screen: () => <FixtureScreen scene={{ moment: 2 }} state={LISTEN} />,
		title: "Xolace+: something to listen to",
	},
	{
		id: "xolacer",
		options: OPTIONS,
		Screen: XolacerSuggestion,
		title: "C2 Xolacer suggestion",
	},
	{
		id: "unlock",
		options: OPTIONS,
		Screen: PartInFocus,
		title: "C2 A part of life comes into focus",
	},
	{
		id: "upsell",
		options: OPTIONS,
		Screen: InsightsUpsell,
		title: "C2 Insights upsell (free)",
	},
	{
		id: "letter-waiting",
		options: OPTIONS,
		Screen: LetterWaiting,
		title: "Letters 30: a letter is waiting for you",
	},
	{
		id: "letter-write",
		options: OPTIONS,
		Screen: LetterWrite,
		title: "Letters 29: write a letter to a stranger",
	},
];
