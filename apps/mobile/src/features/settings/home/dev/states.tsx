import type { DevState } from "@/dev/dev-state";
import { FixtureHome } from "@/features/settings/home/dev/fixture-home";
import {
	HOME_FREE,
	HOME_LOADING,
	HOME_PLUS,
	HOME_PLUS_LOADING,
	HOME_UPDATED,
} from "@/features/settings/home/dev/fixtures";

const OPTIONS = { title: "Settings" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "home-plus",
		options: OPTIONS,
		Screen: () => <FixtureHome state={HOME_PLUS} />,
		title: "Settings on Xolace+",
	},
	{
		id: "home-free",
		options: OPTIONS,
		Screen: () => <FixtureHome state={HOME_FREE} />,
		title: "Settings, free",
	},
	{
		id: "home-updated",
		options: OPTIONS,
		Screen: () => <FixtureHome state={HOME_UPDATED} />,
		title: "Settings, checked: up to date",
	},
	{
		id: "home-loading",
		options: OPTIONS,
		Screen: () => <FixtureHome state={HOME_LOADING} />,
		title: "Settings while preferences and talk time load",
	},
	{
		id: "home-plus-loading",
		options: OPTIONS,
		Screen: () => <FixtureHome state={HOME_PLUS_LOADING} />,
		title: "Settings while Xolace+ is still loading: no offer, no minutes",
	},
];
