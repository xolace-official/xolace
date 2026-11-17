/** The You tab on fixtures: `xolace://dev/you/<id>` (P/design/handoff/you.md §10). */
import type { DevState } from "@/dev/dev-state";
import { FixtureYou } from "@/features/you/home/dev/fixture-you";

/** The tab draws its own see-through header with the gear, as in the app. */
const OPTIONS = { headerTransparent: true, title: "" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "top",
		options: OPTIONS,
		Screen: () => <FixtureYou />,
		title: "You, at the top (Xolace+)",
	},
	{
		id: "docked",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ toDays: true }} />,
		title: "Docked: pills, the avatar and name in the bar",
	},
	{
		id: "week",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ toDays: true, weekRing: true }} />,
		title: "Tapped the week: this week ringed",
	},
	{
		id: "freeze",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ tip: true }} />,
		title: "The freeze explanation, before buying",
	},
	{
		id: "freeze-bought",
		options: OPTIONS,
		Screen: () => <FixtureYou fixture={{ freezes: 2 }} start={{ tip: true }} />,
		title: "The freeze explanation, at the cap",
	},
	{
		id: "follow-ups",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ tab: "follow-ups" }} />,
		title: "Follow-ups: waiting, coming up, earlier",
	},
	{
		id: "new",
		options: OPTIONS,
		Screen: () => <FixtureYou fixture={{ kind: "new", plus: false }} />,
		title: "A new user",
	},
	{
		id: "new-follow-ups",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou
				fixture={{ kind: "new", plus: false }}
				start={{ tab: "follow-ups" }}
			/>
		),
		title: "A new user's follow-ups (empty)",
	},
	{
		id: "free-one-badge",
		options: OPTIONS,
		Screen: () => <FixtureYou fixture={{ badges: "one", plus: false }} />,
		title: "Free, one badge (the star)",
	},
	{
		id: "ended",
		options: OPTIONS,
		Screen: () => <FixtureYou fixture={{ kind: "ended" }} />,
		title: "A streak that ended",
	},
	{
		id: "hidden",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou fixture={{ hidden: ["calendar", "rank"], plus: false }} />
		),
		title: "Your days and Among the fires hidden",
	},
];
