import type { DevState } from "@/dev/dev-state";
import { FixtureAvatar } from "@/features/you/avatar/dev/fixture-avatar";

const OPTIONS = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "avatar",
		options: OPTIONS,
		Screen: () => <FixtureAvatar plus="free" />,
		title: "The avatar sheet, free (locks)",
	},
	{
		id: "avatar-plus",
		options: OPTIONS,
		Screen: () => <FixtureAvatar plus="plus" />,
		title: "The avatar sheet, Xolace+",
	},
	{
		id: "avatar-plus-loading",
		options: OPTIONS,
		Screen: () => <FixtureAvatar plus="loading" />,
		title: "The avatar sheet while Xolace+ loads: no locks",
	},
];
