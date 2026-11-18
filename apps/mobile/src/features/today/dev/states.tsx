/** Today on fixtures: `xolace://dev/today/<id>`. The board's phases (handoff `today.md`
 * §4.1, renders `01`–`04`), each in light and dark, the first open, the streak igniting,
 * and Today with nothing loaded (offline). */
import type { DevState } from "@/dev/dev-state";
import { today } from "./fixture-today";

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{ id: "evening", title: "01 Evening", ...today({ phase: "evening" }) },
	{ id: "dawn", title: "02 Dawn", ...today({ phase: "dawn" }) },
	{ id: "day", title: "03 Day", ...today({ phase: "day" }) },
	{ id: "late", title: "04 Late (night mode)", ...today({ phase: "late" }) },
	{
		id: "late-loading",
		title: "Late, the shelf still loading (the quiet row keeps its place)",
		...today({ modules: "loading", phase: "late" }),
	},
	{
		id: "evening-dark",
		title: "01 Evening, dark",
		...today({ phase: "evening", theme: "dark" }),
	},
	{
		id: "dawn-dark",
		title: "02 Dawn, dark",
		...today({ phase: "dawn", theme: "dark" }),
	},
	{
		id: "day-dark",
		title: "03 Day, dark",
		...today({ phase: "day", theme: "dark" }),
	},
	{
		id: "first-open",
		title: "First open of the day",
		...today({ intro: true, phase: "evening" }),
	},
	{
		id: "streak-ignites",
		title: "The streak ignites (12 → 13)",
		...today({ ignite: true, phase: "evening" }),
	},
	{
		id: "rekindle",
		title: "A streak to rekindle (the pill and its dialog)",
		...today({ phase: "evening", rekindle: true }),
	},
	{
		id: "rekindle-dark",
		title: "A streak to rekindle, dark",
		...today({ phase: "day", rekindle: true, theme: "dark" }),
	},
	{
		id: "reflect-waiting",
		title: "Reflect has your words (the card waits; tap zooms in)",
		...today({ phase: "evening", reflect: "waiting" }),
	},
	{
		id: "reflect-waiting-dark",
		title: "Reflect has your words, dark",
		...today({ phase: "day", reflect: "waiting", theme: "dark" }),
	},
	{
		id: "reflect-ready",
		title: "The mirror is back (the card pings; tap zooms in)",
		...today({ phase: "evening", reflect: "ready" }),
	},
	{
		id: "reflect-ready-dark",
		title: "The mirror is back, dark",
		...today({ phase: "day", reflect: "ready", theme: "dark" }),
	},
	{
		id: "month-prompt",
		title: "This month's prompt on the card",
		...today({ monthPrompt: true, phase: "evening" }),
	},
	{
		id: "month-prompt-dark",
		title: "This month's prompt, dark",
		...today({ monthPrompt: true, phase: "day", theme: "dark" }),
	},
	{
		id: "kindling-tended",
		title: "Kindling: back from a step (the completion plays)",
		...today({ phase: "evening", tend: true }),
	},
	{
		id: "kindling-last",
		title:
			"Kindling: the last step tended (the kindling closes, the end plays)",
		...today({ kindling: "last", phase: "evening", tend: true }),
	},
	{
		id: "kindling-put-out",
		title: "Kindling: put out (the card goes, nothing celebrates)",
		...today({ kindling: "last", phase: "evening", putOut: true, tend: true }),
	},
	{
		id: "kindling-three",
		title: "Kindling with three steps, one passed by",
		...today({ kindling: "three", phase: "day" }),
	},
	{
		id: "kindling-all",
		title: "Kindling: all four tended",
		...today({ kindling: "all", phase: "evening" }),
	},
	{
		id: "kindling-dark",
		title: "Kindling and campfire, dark",
		...today({ phase: "evening", theme: "dark" }),
	},
	{
		id: "no-kindling",
		title: "No kindling (S16 fills this frame)",
		...today({ kindling: "none", phase: "evening" }),
	},
	{
		id: "kindling-loading",
		title: "Kindling still loading",
		...today({ kindling: "loading", phase: "evening" }),
	},
	{
		id: "campfire-warming",
		title: "Campfire with no number yet",
		...today({ campfire: "warming", phase: "day" }),
	},
	{
		id: "campfire-intake",
		title: "Campfire from the v2 intake's count",
		...today({ campfire: "stats", kindling: "none", phase: "day" }),
	},
	{
		id: "empty-day",
		title: "Empty day: no kindling, campfire, tracks, moments or word",
		...today({
			campfire: "none",
			kindling: "none",
			modules: "none",
			phase: "day",
		}),
	},
	{
		id: "rail-free",
		title: "A free member's rail: locked tracks",
		...today({ free: true, phase: "evening" }),
	},
	{
		id: "late-free",
		title: "Late, free: the quiet row locked",
		...today({ free: true, phase: "late" }),
	},
	{
		id: "word-late",
		title: "First open, with today's word arriving late (it still inks in)",
		...today({ intro: true, lateWord: true, phase: "evening" }),
	},
	{
		id: "finding",
		title:
			"Day 3 of a v2 intake: “How did you find Xolace?” under the campfire",
		...today({ finding: true, phase: "day" }),
	},
	{
		id: "modules-loading",
		title: "The rail, moments and word still loading",
		...today({ modules: "loading", phase: "day" }),
	},
	{
		id: "modules-dark",
		title: "The rail, moments and word, dark",
		...today({ phase: "evening", theme: "dark" }),
	},
	{
		id: "phases",
		title: "The sky through the day (cycles every 4 s)",
		...today({ cycle: true, phase: "dawn" }),
	},
	{
		id: "offline",
		title: "Offline (no name, no streak, nothing below loaded)",
		...today({ offline: true, phase: "day" }),
	},
	{
		id: "offline-dark",
		title: "Offline, dark",
		...today({ offline: true, phase: "day", theme: "dark" }),
	},
];
