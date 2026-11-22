import type { DevState } from "@/dev/dev-state";
import { FixtureYou } from "@/features/you/home/dev/fixture-you";

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
		id: "loading",
		options: OPTIONS,
		Screen: () => <FixtureYou loading />,
		title: "Loading: the header's skeleton",
	},
	{
		id: "docked",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ toTop: true }} />,
		title: "Docked: pills, the avatar and name in the bar, Steadiness",
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
		id: "this-week",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ toWeek: true }} />,
		title: "This week: your usual and the sentence (Xolace+)",
	},
	{
		id: "this-week-held",
		options: OPTIONS,
		Screen: () => <FixtureYou start={{ toWeek: true, weekHeld: 1 }} />,
		title: "This week, holding Tuesday: its day and how it ended",
	},
	{
		id: "this-week-held-longest",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou
				fixture={{ week: "longest" }}
				start={{ toWeek: true, weekHeld: 1 }}
			/>
		),
		title: "This week, holding the longest line a day can say",
	},
	{
		id: "this-week-held-sparse",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou
				fixture={{ week: "sparse" }}
				start={{ toWeek: true, weekHeld: 1 }}
			/>
		),
		title: "This week, holding a day that named nothing: only its count",
	},
	{
		id: "this-week-held-capped",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou
				fixture={{ week: "capped" }}
				start={{ toWeek: true, weekHeld: 3 }}
			/>
		),
		title: "This week, holding a day the read cap cut: its bar, no second line",
	},
	{
		id: "this-week-earlier",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou fixture={{ earlierWeek: true }} start={{ toWeek: true }} />
		),
		title: "This week paged back a week (Xolace+)",
	},
	{
		id: "this-week-no-usual",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou fixture={{ week: "no-usual" }} start={{ toWeek: true }} />
		),
		title: "This week in the first weeks: no usual yet",
	},
	{
		id: "this-week-empty",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou fixture={{ week: "empty" }} start={{ toWeek: true }} />
		),
		title: "This week on Monday morning: nothing yet",
	},
	{
		id: "this-week-free",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou fixture={{ plus: false }} start={{ toWeek: true }} />
		),
		title: "This week, free: the earlier-weeks gate",
	},
	{
		id: "steadiness-free",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou fixture={{ plus: false }} start={{ toTop: true }} />
		),
		title: "Steadiness, free: stage words and the locked trend",
	},
	{
		id: "hidden",
		options: OPTIONS,
		Screen: () => (
			<FixtureYou
				fixture={{ hidden: ["calendar", "rank", "week"], plus: false }}
			/>
		),
		title: "Your days, Among the fires and This week hidden",
	},
];
