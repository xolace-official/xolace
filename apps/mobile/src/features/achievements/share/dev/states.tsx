import type { DevState } from "@/dev/dev-state";
import { FixtureBadgeShare } from "@/features/achievements/share/dev/fixture-badge-share";

const OPTIONS = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "share-card",
		options: OPTIONS,
		Screen: () => <FixtureBadgeShare id="streak-10" />,
		title: "Share card: 10 days by the fire, no name",
	},
	{
		id: "share-card-named",
		options: OPTIONS,
		Screen: () => <FixtureBadgeShare id="streak-10" named />,
		title: "Share card with the name on",
	},
	{
		id: "share-card-dawn",
		options: OPTIONS,
		Screen: () => <FixtureBadgeShare id="showing-up-10" />,
		title: "Share card: 10 days showing up (dawn)",
	},
	{
		id: "share-card-long",
		options: OPTIONS,
		Screen: () => <FixtureBadgeShare id="streak-100" named />,
		title: "Share card: the longest copy, named",
	},
	{
		id: "share-card-no-name",
		options: OPTIONS,
		Screen: () => <FixtureBadgeShare displayName={null} id="first-talk" />,
		title: "Share card with no display name: no toggle",
	},
];
