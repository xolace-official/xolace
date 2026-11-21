import type { DevState } from "@/dev/dev-state";
import { LETTERS } from "../../copy";
import {
	RECEIVED_SAMPLE,
	receivedLetter,
	SENT_SAMPLE,
	SENT_THREE_WAITING,
	WAITING,
} from "../../dev/fixtures";
import { type HubFixture, HubFixtureScreen } from "./hub-fixture";

const OPTIONS = { title: LETTERS.title };
const hub = (fixture: HubFixture) => () => (
	<HubFixtureScreen fixture={fixture} />
);

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "hub-empty",
		options: OPTIONS,
		Screen: hub({}),
		title: "4 · Letters, empty",
	},
	{
		id: "hub-off",
		options: OPTIONS,
		Screen: hub({ sent: SENT_SAMPLE, status: { optIn: "no" } }),
		title: "5 · Not opted in (off, Turn on)",
	},
	{
		id: "hub-offer",
		options: OPTIONS,
		Screen: hub({ sent: SENT_SAMPLE, status: { optIn: "unset" } }),
		title: "5 · The offer, on Letters",
	},
	{
		id: "hub-wrote-today",
		options: OPTIONS,
		Screen: hub({
			received: RECEIVED_SAMPLE,
			sent: SENT_SAMPLE,
			status: { writeLimit: "today" },
		}),
		title: "14 · Wrote today",
	},
	{
		id: "hub-three-waiting",
		options: OPTIONS,
		Screen: hub({
			received: RECEIVED_SAMPLE,
			sent: SENT_THREE_WAITING,
			status: { writeLimit: "three" },
		}),
		title: "15 · Three waiting",
	},
	{
		id: "hub-sent-statuses",
		options: OPTIONS,
		Screen: hub({ received: RECEIVED_SAMPLE, sent: SENT_SAMPLE }),
		title: "16 · Sent statuses",
	},
	{
		id: "hub-mark-lights",
		options: OPTIONS,
		Screen: hub({
			received: RECEIVED_SAMPLE,
			sent: SENT_SAMPLE.map((l) =>
				l.status === "waiting" ? l : { ...l, seen: false }
			),
		}),
		title: "16 · Received marks light",
	},
	{
		id: "hub-withdraw",
		options: OPTIONS,
		Screen: hub({
			opens: { withdraw: "a" },
			received: RECEIVED_SAMPLE,
			sent: SENT_SAMPLE,
		}),
		title: "17 · Withdraw",
	},
	{
		id: "hub-unopened",
		options: OPTIONS,
		Screen: hub({
			received: [WAITING, ...RECEIVED_SAMPLE],
			sent: SENT_SAMPLE,
			status: { unopenedId: WAITING.id },
		}),
		title: "19 · Unopened (blocks the next)",
	},
	{
		id: "hub-received",
		options: OPTIONS,
		Screen: hub({
			received: [
				receivedLetter("long"),
				receivedLetter("warm", { acknowledged: true }),
				...RECEIVED_SAMPLE,
			],
			sent: SENT_SAMPLE,
		}),
		title: "26 · Received letters, to reread",
	},
	{
		id: "hub-hidden",
		options: OPTIONS,
		Screen: hub({
			opens: { hidden: true },
			received: [
				receivedLetter("warm"),
				receivedLetter("long", { hidden: true }),
				receivedLetter("short", { acknowledged: true, hidden: true }),
			],
			sent: SENT_SAMPLE,
		}),
		title: "35 · Hidden letters (Hidden · N)",
	},
];
