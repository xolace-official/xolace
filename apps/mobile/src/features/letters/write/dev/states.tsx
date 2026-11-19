/** The writing screen on fixtures: `xolace://dev/letters/write-<state>`. */
import type { DevState } from "@/dev/dev-state";
import { LETTERS } from "../../copy";
import { DRAFTS, FIXABLE_LINE } from "../../dev/fixtures";
import { type WriteFixture, WriteFixtureScreen } from "./write-fixture";

const OPTIONS = { title: LETTERS.write.title };
const write = (fixture: WriteFixture) => () => (
	<WriteFixtureScreen fixture={fixture} />
);
const PASS = { kind: "pass" } as const;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "write",
		options: OPTIONS,
		Screen: write({ outcome: PASS, text: DRAFTS.pass }),
		title: "6 · Write",
	},
	{
		id: "write-empty",
		options: OPTIONS,
		Screen: write({ outcome: PASS }),
		title: "6 · Write, nothing yet",
	},
	{
		id: "write-under-40",
		options: OPTIONS,
		Screen: write({
			opens: { focus: true },
			outcome: PASS,
			text: DRAFTS.short,
		}),
		title: "7 · Under 40, keyboard up",
	},
	{
		id: "write-near-limit",
		options: OPTIONS,
		Screen: write({ outcome: PASS, text: DRAFTS.near }),
		title: "8 · Near 500",
	},
	{
		id: "write-reading",
		options: OPTIONS,
		Screen: write({ opens: { stage: "wait" }, text: DRAFTS.pass }),
		title: "9 · Reading it over (the check)",
	},
	{
		id: "write-reading-reduced",
		options: OPTIONS,
		Screen: write({
			opens: { reduced: true, stage: "wait" },
			text: DRAFTS.pass,
		}),
		title: "33 · Reduce Motion, the wait",
	},
	{
		id: "write-on-its-way",
		options: OPTIONS,
		Screen: write({ opens: { stage: "sent" } }),
		title: "10 · On its way",
	},
	{
		id: "write-fixable",
		options: OPTIONS,
		Screen: write({
			opens: { line: FIXABLE_LINE },
			outcome: PASS,
			text: DRAFTS.fixable,
		}),
		title: "11 · Fixable",
	},
	{
		id: "write-held",
		options: OPTIONS,
		Screen: write({ held: DRAFTS.pass, outcome: PASS, text: DRAFTS.pass }),
		title: "12 · Held (Send off until it changes)",
	},
	{
		id: "write-at-risk",
		options: OPTIONS,
		Screen: write({
			opens: { care: true, stage: "rest" },
			outcome: PASS,
			text: DRAFTS.pass,
		}),
		title: "13 · At risk: care",
	},
	{
		id: "write-wrote-today",
		options: OPTIONS,
		Screen: write({ limit: "today" }),
		title: "14 · Wrote today",
	},
	{
		id: "write-three-waiting",
		options: OPTIONS,
		Screen: write({ limit: "three" }),
		title: "15 · Three waiting",
	},
	{
		id: "write-not-english",
		options: OPTIONS,
		Screen: write({
			opens: { line: LETTERS.check.lang },
			outcome: PASS,
			text: DRAFTS.spanish,
		}),
		title: "34 · Not English",
	},
	{
		id: "send-pass",
		options: OPTIONS,
		Screen: write({ outcome: PASS, text: DRAFTS.pass }),
		title: "Send → pass (rises)",
	},
	{
		id: "send-unavailable",
		options: OPTIONS,
		Screen: write({ outcome: { kind: "unavailable" }, text: DRAFTS.pass }),
		title: "Send → check can't finish (reads as pass)",
	},
	{
		id: "send-fixable",
		options: OPTIONS,
		Screen: write({
			outcome: { kind: "fixable", line: FIXABLE_LINE },
			text: DRAFTS.fixable,
		}),
		title: "Send → fixable (comes back with a line)",
	},
	{
		id: "send-held",
		options: OPTIONS,
		Screen: write({ outcome: { kind: "held" }, text: DRAFTS.pass }),
		title: "Send → held",
	},
	{
		id: "send-lang",
		options: OPTIONS,
		Screen: write({ outcome: { kind: "lang" }, text: DRAFTS.spanish }),
		title: "Send → not English",
	},
	{
		id: "send-risk",
		options: OPTIONS,
		Screen: write({ outcome: { kind: "risk" }, text: DRAFTS.pass }),
		title: "Send → at risk (care rises)",
	},
	{
		id: "send-limit",
		options: OPTIONS,
		Screen: write({
			outcome: { kind: "limit", reason: "today" },
			text: DRAFTS.pass,
		}),
		title: "Send → another device wrote today's",
	},
	{
		id: "write-late-care",
		options: OPTIONS,
		Screen: write({ late: { kind: "risk" }, text: DRAFTS.pass }),
		title: "Reopened mid-check → at risk (care rises)",
	},
	{
		id: "write-late-fixable",
		options: OPTIONS,
		Screen: write({
			late: { kind: "fixable", line: FIXABLE_LINE },
			text: DRAFTS.pass,
		}),
		title: "Reopened mid-check → fixable line",
	},
];
