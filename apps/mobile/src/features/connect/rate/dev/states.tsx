import type { DevState } from "@/dev/dev-state";
import { FixtureRate } from "./fixture-rate";

const SHEET = { headerShown: false };
const MAYA = { counterpartName: "Maya" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "rate",
		options: SHEET,
		Screen: () => <FixtureRate conversation={MAYA} />,
		title: "Rate a conversation: no stars yet",
	},
	{
		id: "rate-again",
		options: SHEET,
		Screen: () => <FixtureRate conversation={{ ...MAYA, myRating: 4 }} />,
		title: "Rate a conversation you already rated: Update",
	},
	{
		id: "rate-nothing",
		options: SHEET,
		Screen: () => <FixtureRate conversation={null} />,
		title: "Nothing to rate: no messages were exchanged",
	},
	{
		id: "rate-loading",
		options: SHEET,
		Screen: () => <FixtureRate conversation={undefined} />,
		title: "Rate loading",
	},
];
