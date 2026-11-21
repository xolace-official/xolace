import type { DevState } from "@/dev/dev-state";
import { receivedLetter, WAITING } from "../../dev/fixtures";
import { type ReadFixture, ReadFixtureScreen } from "./read-fixture";

const OPTIONS = { title: "" };
const read = (fixture: ReadFixture) => () => (
	<ReadFixtureScreen fixture={fixture} />
);

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "read-sealed",
		options: OPTIONS,
		Screen: read({ letter: WAITING }),
		title: "20 · Sealed (drag or Open)",
	},
	{
		id: "read-open",
		options: OPTIONS,
		Screen: read({ letter: receivedLetter("warm") }),
		title: "21 · Open",
	},
	{
		id: "read-acknowledge-undo",
		options: OPTIONS,
		Screen: read({ letter: receivedLetter("warm"), undo: "ack" }),
		title: "22 · Acknowledge + Undo",
	},
	{
		id: "read-acknowledged",
		options: OPTIONS,
		Screen: read({ letter: receivedLetter("warm", { acknowledged: true }) }),
		title: "23 · Acknowledged",
	},
	{
		id: "read-hide-undo",
		options: OPTIONS,
		Screen: read({
			letter: receivedLetter("warm"),
			light: "dusk",
			undo: "hide",
		}),
		title: "24 · Hide + Undo (dusk)",
	},
	{
		id: "read-dusk",
		options: OPTIONS,
		Screen: read({ letter: receivedLetter("warm"), light: "dusk" }),
		title: "31 · Dusk, open",
	},
	{
		id: "read-night-sealed",
		options: OPTIONS,
		Screen: read({ letter: WAITING, light: "night" }),
		title: "Night, sealed",
	},
	{
		id: "read-long",
		options: OPTIONS,
		Screen: read({ letter: receivedLetter("long") }),
		title: "A long letter (the paper grows)",
	},
	{
		id: "read-hidden",
		options: OPTIONS,
		Screen: read({ letter: receivedLetter("long", { hidden: true }) }),
		title: "35 · A hidden letter (Unhide)",
	},
];
