/** Settings › Appearance on fixtures: `xolace://dev/settings/<id>` (handoff settings.md §9–§10). */

import { themeVariant } from "@/design/themes";
import type { DevState } from "@/dev/dev-state";
import { FixtureAppearance } from "@/features/settings/appearance/dev/fixture-appearance";
import {
	APPEARANCE_CALMED,
	APPEARANCE_DARK_ROSE,
	APPEARANCE_FREE,
	APPEARANCE_REPLAY,
	APPEARANCE_TOP,
} from "@/features/settings/appearance/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Appearance" };
const ROSE_DARK = themeVariant("rose", "dark");

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "appearance-top",
		options: OPTIONS,
		Screen: () => <FixtureAppearance state={APPEARANCE_TOP} />,
		title: "Appearance, top (render 07)",
	},
	{
		id: "appearance-scrolled",
		options: OPTIONS,
		Screen: () => <FixtureAppearance atEnd state={APPEARANCE_TOP} />,
		title: "Appearance, scrolled to the end (render 08)",
	},
	{
		id: "appearance-free-locked",
		options: OPTIONS,
		Screen: () => <FixtureAppearance state={APPEARANCE_FREE} />,
		title: "Appearance, free with the Plus themes locked (render 09)",
	},
	{
		id: "appearance-dark-rose",
		options: OPTIONS,
		Screen: () => (
			<FixtureAppearance state={APPEARANCE_DARK_ROSE} theme={ROSE_DARK} />
		),
		title: "Appearance, Dark with Rosé (render 10)",
	},
	{
		id: "appearance-replay-alert",
		options: OPTIONS,
		Screen: () => <FixtureAppearance state={APPEARANCE_REPLAY} />,
		title: "Appearance, the Replay intro alert (render 11)",
	},
	{
		id: "appearance-calmed",
		options: OPTIONS,
		Screen: () => <FixtureAppearance atEnd state={APPEARANCE_CALMED} />,
		title: "Appearance, Reduced motion, night off, a card hidden",
	},
];
