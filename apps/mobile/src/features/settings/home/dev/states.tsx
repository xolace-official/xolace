/** Settings' main screen on fixtures: `xolace://dev/settings/<id>` (handoff settings.md §10). */
import type { DevState } from "@/dev/dev-state";
import { FixtureHome } from "@/features/settings/home/dev/fixture-home";
import {
	HOME_FREE,
	HOME_LOADING,
	HOME_PLUS,
	HOME_UPDATED,
} from "@/features/settings/home/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
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
];
