import type { DevState } from "@/dev/dev-state";
import { live, play, still } from "./fixture-sit";
import { FixtureSwapSheet } from "./fixture-swap";
import {
	FIND_YOUR_EDGES,
	LET_IT_LAND,
	MAKE_ROOM,
	RESET,
	SOFTEN_TOWARD_IT,
	SPEAK_TO_IT,
} from "./fixtures";

const SHEET = { headerShown: false };

const WRITTEN = 2600;
const INHALE = 2200;
const TOP = 4500;
const EXHALE = 7600;
const ROOM_OUT = 6400;
const PULSE = 400;
const DRAINING = 900;
const DARK = { theme: "dark" } as const;
const LATE = { late: true } as const;
const PAUSED = { paused: true } as const;
const ROOM = { exercise: MAKE_ROOM };
const SOFTEN = { exercise: SOFTEN_TOWARD_IT };
const SPEAK = { exercise: SPEAK_TO_IT };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{ id: "first-screen", title: "01 First screen", ...live({ stage: "pre" }) },
	{ id: "line", title: "02 A line", ...still(0, WRITTEN) },
	{ id: "mirror-line", title: "03 From your mirror", ...still(1, WRITTEN) },
	{ id: "breathe-in", title: "04 Breathe in", ...still(2, INHALE) },
	{ id: "a-little-more", title: "05 A little more", ...still(2, TOP) },
	{ id: "breathe-out", title: "06 Breathe out", ...still(2, EXHALE) },
	{
		id: "make-room-out",
		title: "07 Make room, out",
		...still(2, ROOM_OUT, ROOM),
	},
	{
		id: "line-that-breathes",
		title: "08 A line that breathes",
		...still(3, INHALE, ROOM),
	},
	{ id: "hand-pulse", title: "09 Hand pulse", ...still(3, PULSE, SOFTEN) },
	{
		id: "write",
		title: "10 Write",
		...live({ beat: 3, stage: "play" }, SPEAK),
	},
	{
		id: "something-different",
		title: "11 Something different (tap it)",
		...still(0, WRITTEN),
	},
	{
		id: "swap-sheet",
		options: SHEET,
		Screen: () => <FixtureSwapSheet />,
		title: "11 Something else? (the sheet)",
	},
	{
		id: "swap-sheet-once-more",
		options: SHEET,
		Screen: () => <FixtureSwapSheet current="reset" swaps={1} theme="dark" />,
		title: "11 The sheet after a swap to Three breaths",
	},
	{
		id: "swap-sheet-loading",
		options: SHEET,
		Screen: () => <FixtureSwapSheet loading />,
		title: "11 The sheet before its options arrive",
	},
	{ id: "paused", title: "12 Paused on a line", ...still(0, WRITTEN, PAUSED) },
	{
		id: "paused-breathing",
		title: "12b Paused, breathing",
		...still(2, INHALE, PAUSED),
	},
	{
		id: "you-stayed",
		title: "13 You stayed (Done draining)",
		...play({
			scene: { at: { seek: DRAINING, stage: "close" }, hold: true },
			theme: "light",
		}),
	},
	{
		id: "you-stayed-live",
		title: "13 You stayed, live",
		...live({ stage: "close" }),
	},
	{
		id: "late-breathe-in",
		title: "14 Late, breathe in",
		...still(2, INHALE, LATE),
	},
	{ id: "late-line", title: "15 Late, a line", ...still(0, WRITTEN, LATE) },
	{
		id: "late-you-stayed",
		title: "16 Late, you stayed",
		...live({ stage: "close" }, LATE),
	},
	{
		id: "reduced-motion",
		title: "17 Reduced motion",
		...still(2, INHALE, { reduced: true }),
	},
	{
		id: "three-breaths",
		title: "18 Three breaths",
		...still(1, INHALE, { exercise: RESET }),
	},
	{
		id: "dark-first-screen",
		title: "Dark: first screen",
		...live({ stage: "pre" }, DARK),
	},
	{ id: "dark-line", title: "Dark: a line", ...still(1, WRITTEN, DARK) },
	{
		id: "dark-breathe-in",
		title: "Dark: breathe in",
		...still(2, INHALE, DARK),
	},
	{
		id: "dark-hand-pulse",
		title: "Dark: hand pulse",
		...still(3, PULSE, { ...SOFTEN, ...DARK }),
	},
	{
		id: "dark-write",
		title: "Dark: write",
		...live({ beat: 3, stage: "play" }, { ...SPEAK, ...DARK }),
	},
	{
		id: "dark-you-stayed",
		title: "Dark: you stayed",
		...live({ stage: "close" }, DARK),
	},
	{
		id: "kindling",
		title: "A kindling twig’s replay",
		...play({ from: "kindling", slots: {} }),
	},
	{
		id: "today",
		title: "From Today’s Sit door: Three breaths on its own",
		...play({ exercise: RESET, from: "today", slots: {} }),
	},
	{ id: "play-make-room", title: "Play: Make room", ...play(ROOM) },
	{
		id: "play-soften-toward-it",
		title: "Play: Soften toward it",
		...play(SOFTEN),
	},
	{
		id: "play-find-your-edges",
		title: "Play: Find your edges",
		...play({ exercise: FIND_YOUR_EDGES }),
	},
	{
		id: "play-three-breaths",
		title: "Play: Three breaths",
		...play({ exercise: RESET }),
	},
	{ id: "play-speak-to-it", title: "Play: Speak to it", ...play(SPEAK) },
	{
		id: "play-let-it-land",
		title: "Play: Let it land",
		...play({ exercise: LET_IT_LAND }),
	},
	{ id: "loading", title: "Getting ready", ...play({ status: "loading" }) },
	{ id: "empty", title: "No exercise available", ...play({ status: "empty" }) },
];
