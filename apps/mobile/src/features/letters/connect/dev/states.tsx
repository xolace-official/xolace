/** Connect's Letters card on fixtures: `xolace://dev/letters/card-<state>`. */
import type { DevState } from "@/dev/dev-state";
import type { LettersStatus } from "../../letters-model";
import { CardFixtureScreen } from "./card-fixture";

/** As Connect shows it: the stack's large title. */
const OPTIONS = { headerLargeTitle: true, title: "Connect" };
const card = (status: Partial<LettersStatus>) => () => (
	<CardFixtureScreen status={status} />
);

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "card-offer",
		options: OPTIONS,
		Screen: card({ optIn: "unset" }),
		title: "1 · Connect card, with the offer (release starts here)",
	},
	{
		id: "card-invite",
		options: OPTIONS,
		Screen: card({}),
		title: "1 · Connect card, opted in, nothing waiting",
	},
	{
		id: "card-off",
		options: OPTIONS,
		Screen: card({ optIn: "no" }),
		title: "1 · Connect card, not receiving: write only",
	},
	{
		id: "card-arrives",
		options: OPTIONS,
		Screen: card({ unopenedId: "waiting" }),
		title: "18 · A letter arrives on the shelf",
	},
	{
		id: "card-wrote-today",
		options: OPTIONS,
		Screen: card({ writeLimit: "today" }),
		title: "14 · Connect card, today's letter written",
	},
	{
		id: "card-three-waiting",
		options: OPTIONS,
		Screen: card({ writeLimit: "three" }),
		title: "15 · Connect card, three waiting",
	},
];
