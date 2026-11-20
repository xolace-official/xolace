/** Write's dictation on fixtures, `xolace://dev/reflect/<id>`: holding the mic, a Plus take's
 * countdown, its "writing it down" and its note, and the first mic tap's upsell. Registered
 * under Reflect with the rest of its states (`../../dev/states.tsx`). */
import type { DevState } from "@/dev/dev-state";
import { reflect } from "../../dev/fixture-reflect";

/** As `dictation-fallback.ts` words it when the day's budget is spent. */
const TAKE_NOTE = "Sharper dictation is back tomorrow.";

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "listening",
		title: "Holding the mic",
		...reflect({ listening: true, text: "I keep" }),
	},
	{
		id: "take-countdown",
		title: "A Plus take's last seconds counting down",
		...reflect({
			listening: true,
			take: { note: null, remainingMs: 9000, scribe: true, writing: false },
			text: "I keep",
		}),
	},
	{
		id: "take-writing",
		title: "A Plus take being written down (send waits)",
		...reflect({
			take: { note: null, remainingMs: null, scribe: false, writing: true },
			text: "I keep",
		}),
	},
	{
		id: "take-note",
		title: "A Plus take's note: fell back to on-device",
		...reflect({
			take: {
				note: TAKE_NOTE,
				remainingMs: null,
				scribe: false,
				writing: false,
			},
			text: "I keep",
		}),
	},
	{
		id: "upsell",
		title: "The first mic tap's Plus upsell",
		...reflect({ upsellOpen: true }),
	},
];
