import type { DevState } from "@/dev/dev-state";
import { kindling } from "./fixture-kindling";
import { BOARD, viewOf, WITH_XOLACER } from "./fixtures";

const LOADS_MS = 1500;

const LIGHT = { theme: "light" } as const;
const FIRST_TENDED = viewOf(BOARD, ["done", "wait", "wait", "wait"]);
const LAST_TENDED = viewOf(BOARD, ["wait", "wait", "wait", "done"]);
const PASSED = viewOf(BOARD, ["done", "passed", "wait", "wait"]);
const ALL = viewOf(BOARD, ["done", "done", "done", "done"]);
const SOME = viewOf(BOARD, ["done", "passed", "done", "done"]);
const NONE_TENDED = viewOf(BOARD, ["passed", "passed", "passed", "passed"]);
const TRAIL = viewOf(BOARD);
const NONE_YET = viewOf(BOARD, ["wait", "wait", "wait", "wait"]);
const ONE_LEFT = viewOf(BOARD, ["done", "wait", "done", "done"]);
const ARRIVE_FIRST = [0] as const;
const ARRIVE_SECOND = [1] as const;
const ARRIVE_TWO = [0, 2] as const;
const ARRIVE_ALL = [0, 1, 2, 3] as const;
const XOLACER = 1;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "trail",
		title: "01 Trail (tap to tend, Not for me, Undo)",
		...kindling({ view: TRAIL }),
	},
	{
		id: "trail-light",
		title: "14 Trail, Daylight",
		...kindling({ ...LIGHT, view: TRAIL }),
	},
	{
		id: "tend-on-return",
		title: "02 A tend plays on return",
		...kindling({ arrive: ARRIVE_FIRST, view: TRAIL }),
	},
	{
		id: "tend-on-return-light",
		title: "02 A tend plays, Daylight",
		...kindling({ ...LIGHT, arrive: ARRIVE_FIRST, view: TRAIL }),
	},
	{
		id: "two-on-return",
		title: "Two tends play in trail order",
		...kindling({ arrive: ARRIVE_TWO, view: TRAIL }),
	},
	{
		id: "four-on-return",
		title: "Four tends play, the last into the fire",
		...kindling({ arrive: ARRIVE_ALL, view: NONE_YET }),
	},
	{
		id: "into-the-fire",
		title: "The last tend rides into the fire",
		...kindling({ arrive: ARRIVE_SECOND, view: ONE_LEFT }),
	},
	{
		id: "into-the-fire-light",
		title: "Into the fire, Daylight",
		...kindling({ ...LIGHT, arrive: ARRIVE_SECOND, view: ONE_LEFT }),
	},
	{
		id: "one-left",
		title: "One left (Begin rides into the fire, Not for me catches in place)",
		...kindling({ view: ONE_LEFT }),
	},
	{
		id: "tended",
		title: "03–04 First tended, card moved on",
		...kindling({ view: FIRST_TENDED }),
	},
	{
		id: "tended-light",
		title: "03–04 First tended, Daylight",
		...kindling({ ...LIGHT, view: FIRST_TENDED }),
	},
	{
		id: "out-of-order",
		title: "06 Tended out of order",
		...kindling({ view: LAST_TENDED }),
	},
	{
		id: "out-of-order-light",
		title: "06 Out of order, Daylight",
		...kindling({ ...LIGHT, view: LAST_TENDED }),
	},
	{ id: "passed", title: "08 Passed by", ...kindling({ view: PASSED }) },
	{
		id: "refused",
		title: "I did this, refused mid-burn",
		...kindling({ refuses: true, view: PASSED }),
	},
	{
		id: "passed-light",
		title: "08 Passed by, Daylight",
		...kindling({ ...LIGHT, view: PASSED }),
	},
	{ id: "all-tended", title: "09 All tended", ...kindling({ view: ALL }) },
	{
		id: "all-tended-light",
		title: "15 All tended, Daylight",
		...kindling({ ...LIGHT, view: ALL }),
	},
	{ id: "some-passed", title: "10 Some passed", ...kindling({ view: SOME }) },
	{
		id: "some-passed-light",
		title: "10 Some passed, Daylight",
		...kindling({ ...LIGHT, view: SOME }),
	},
	{
		id: "none-tended",
		title: "None tended, all passed",
		...kindling({ view: NONE_TENDED }),
	},
	{
		id: "none-tended-light",
		title: "None tended, Daylight",
		...kindling({ ...LIGHT, view: NONE_TENDED }),
	},
	{
		id: "finding",
		title: "Finding someone (xolacer)",
		...kindling({
			matching: XOLACER,
			view: viewOf(WITH_XOLACER, ["done", "wait", "wait"]),
		}),
	},
	{
		id: "finding-light",
		title: "Finding someone, Daylight",
		...kindling({
			...LIGHT,
			matching: XOLACER,
			view: viewOf(WITH_XOLACER, ["done", "wait", "wait"]),
		}),
	},
	{ id: "loading", title: "Loading", ...kindling({ status: "loading" }) },
	{
		id: "loading-then-ready",
		title: "Loading, then the trail (one scroll: the large title still folds)",
		...kindling({ loadsMs: LOADS_MS, view: TRAIL }),
	},
	{
		id: "loading-light",
		title: "Loading, Daylight",
		...kindling({ ...LIGHT, status: "loading" }),
	},
	{ id: "offline", title: "Offline", ...kindling({ status: "offline" }) },
	{
		id: "offline-light",
		title: "Offline, Daylight",
		...kindling({ ...LIGHT, status: "offline" }),
	},
	{ id: "none", title: "No kindling", ...kindling({ status: "none" }) },
	{
		id: "none-light",
		title: "No kindling, Daylight",
		...kindling({ ...LIGHT, status: "none" }),
	},
];
