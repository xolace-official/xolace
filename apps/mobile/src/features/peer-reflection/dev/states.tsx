/** You're not alone on fixtures: `xolace://dev/peer-reflection/<id>`. The handoff's
 * renders (`peers.md` §10, numbered as they are) and the prototype's Review jumps.
 * A still holds the arrival at that instant; "arrived" holds it at its end. */
import type { DevState } from "@/dev/dev-state";
import { peers, reportSheet } from "./fixture-peers";
import { LONG, MATCH, RECENT } from "./fixtures";

/** The arrival held at its end: everything landed and written. */
const ARRIVED = Number.POSITIVE_INFINITY;
/** 02 and 03 are pinned mid-arrival (board ms). */
const AT_900 = 900;
const AT_1450 = 1450;
const FIRST = 0;
const SECOND = 1;
const DARK = { theme: "dark" } as const;
const LATE = { late: true } as const;
const MATCHED = { rows: MATCH, set: "match" } as const;
const RECENTLY = { rows: RECENT, set: "recent" } as const;
const NONE = { rows: [], set: "none" } as const;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "loading",
		title: "01 Loading",
		...peers({ ...MATCHED, loading: true }),
	},
	{
		id: "arriving",
		title: "02 Arriving, 900 ms",
		...peers({ ...MATCHED, scene: { hold: AT_900 } }),
	},
	{
		id: "arriving-later",
		title: "03 Arriving, 1450 ms",
		...peers({ ...MATCHED, scene: { hold: AT_1450 } }),
	},
	{ id: "arrive", title: "Arrive (plays)", ...peers(MATCHED) },
	{
		id: "arrived",
		title: "04 Arrived",
		...peers({ ...MATCHED, scene: { hold: ARRIVED } }),
	},
	{
		id: "felt",
		title: "05–06 Felt this (plays the tap)",
		...peers({ ...MATCHED, scene: { hold: ARRIVED, tap: FIRST } }),
	},
	{
		id: "hold",
		title: "07 Hold (hold a card for the menu)",
		...peers({ ...MATCHED, scene: { hold: ARRIVED } }),
	},
	{ id: "report-sheet", title: "08 Report sheet", ...reportSheet() },
	{
		id: "reported",
		title: "09 Reported",
		...peers({ ...MATCHED, reportAfter: SECOND, scene: { hold: ARRIVED } }),
	},
	{
		id: "slow-down",
		title: "10 Slow down",
		...peers({
			...MATCHED,
			scene: { hold: ARRIVED, tap: FIRST },
			slowNext: true,
		}),
	},
	{
		id: "the-end",
		title: "11 The end (scrolled)",
		...peers({ ...MATCHED, scene: { hold: ARRIVED, scrollEnd: true } }),
	},
	{
		id: "no-close-match",
		title: "12 No close match",
		...peers({ ...RECENTLY, scene: { hold: ARRIVED } }),
	},
	{
		id: "none-yet",
		title: "13 None yet",
		...peers({ ...NONE, scene: { hold: ARRIVED } }),
	},
	{
		id: "late-felt",
		title: "14 Late, felt",
		...peers({ ...MATCHED, ...LATE, scene: { hold: ARRIVED, tap: FIRST } }),
	},
	{
		id: "late-no-close-match",
		title: "15 Late, no close match",
		...peers({ ...RECENTLY, ...LATE, scene: { hold: ARRIVED } }),
	},
	{
		id: "late-none-yet",
		title: "16 Late, none yet",
		...peers({ ...NONE, ...LATE, scene: { hold: ARRIVED } }),
	},
	{
		id: "reduced-motion",
		title: "17 Reduced motion, felt",
		...peers({
			...MATCHED,
			scene: { hold: ARRIVED, reduced: true, tap: FIRST },
		}),
	},
	{
		id: "no-bridge",
		title: "No bridge (nothing to leave)",
		...peers({ ...MATCHED, bridge: false, scene: { hold: ARRIVED } }),
	},
	{
		id: "read-more",
		title: "A long quote (Read more)",
		...peers({ rows: LONG, scene: { hold: ARRIVED }, set: "match" }),
	},
	{
		id: "dark-arrived",
		title: "Dark: arrived",
		...peers({ ...MATCHED, ...DARK, scene: { hold: ARRIVED } }),
	},
	{
		id: "dark-felt",
		title: "Dark: felt",
		...peers({ ...MATCHED, ...DARK, scene: { hold: ARRIVED, tap: FIRST } }),
	},
	{
		id: "dark-no-close-match",
		title: "Dark: no close match",
		...peers({ ...RECENTLY, ...DARK, scene: { hold: ARRIVED } }),
	},
	{
		id: "dark-none-yet",
		title: "Dark: none yet",
		...peers({ ...NONE, ...DARK, scene: { hold: ARRIVED } }),
	},
	{
		id: "dark-loading",
		title: "Dark: loading",
		...peers({ ...MATCHED, ...DARK, loading: true }),
	},
	{
		id: "dark-report-sheet",
		title: "Dark: report sheet",
		...reportSheet("dark"),
	},
];
