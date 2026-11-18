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
		id: "offline",
		title: "Offline (no name, no streak)",
		...today({ offline: true, phase: "day" }),
	},
	{
		id: "offline-dark",
		title: "Offline, dark",
		...today({ offline: true, phase: "day", theme: "dark" }),
	},
];
