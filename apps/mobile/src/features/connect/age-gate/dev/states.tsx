import type { DevState } from "@/dev/dev-state";
import { FixtureAgeGate } from "./fixture-age-gate";

const SHEET = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "age-ask",
		options: SHEET,
		Screen: () => <FixtureAgeGate />,
		title: "Age gate: when were you born?",
	},
	{
		id: "age-declined",
		options: SHEET,
		Screen: () => <FixtureAgeGate step="declined" />,
		title: "Age gate: prefer not to say",
	},
	{
		id: "age-teen",
		options: SHEET,
		Screen: () => <FixtureAgeGate step="not_available" />,
		title: "Age gate: 13 to 17",
	},
	{
		id: "age-child",
		options: SHEET,
		Screen: () => <FixtureAgeGate step="under_13" />,
		title: "Age gate: under 13",
	},
	{
		id: "age-ask-letters",
		options: SHEET,
		Screen: () => <FixtureAgeGate surface="letters" />,
		title: "Age gate for Letters",
	},
	{
		id: "age-teen-letters",
		options: SHEET,
		Screen: () => <FixtureAgeGate step="not_available" surface="letters" />,
		title: "Age gate for Letters: 13 to 17",
	},
];
