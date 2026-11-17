/** Lantern on fixtures: `xolace://dev/lantern/<id>`. */
import { router } from "expo-router";
import type { DevState } from "@/dev/dev-state";
import { COPY } from "@/features/lantern/copy";
import {
	FixtureHome,
	FixtureHub,
	FixtureList,
	FixtureSubjects,
} from "@/features/lantern/dev/fixture-screens";
import { home, hub, ofKind, SAVED } from "@/features/lantern/dev/fixtures";
import { WelcomeScreen } from "@/features/lantern/welcome/welcome-screen";

/** The screens set their own bars, as their routes do. */
const OWN_BAR = { title: "" };
const NO_BAR = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "welcome",
		options: NO_BAR,
		Screen: () => <WelcomeScreen onBegin={() => router.back()} />,
		title: "Welcome (first visit)",
	},
	{
		id: "home",
		options: OWN_BAR,
		Screen: () => <FixtureHome home={home()} />,
		title: "Home, returning",
	},
	{
		id: "reading-as",
		options: OWN_BAR,
		Screen: () => <FixtureHome home={home(true)} />,
		title: "Home, first visit: Reading as…",
	},
	{
		id: "arrival",
		options: OWN_BAR,
		Screen: () => <FixtureHome arrival={1} home={home(true)} />,
		title: "Home, rising in after the welcome",
	},
	{
		id: "home-loading",
		options: OWN_BAR,
		Screen: () => <FixtureHome home={undefined} />,
		title: "Home, loading",
	},
	{
		id: "hub",
		options: OWN_BAR,
		Screen: () => <FixtureHub hub={hub()} />,
		title: "A hub: the partway line, Read chips, a listen",
	},
	{
		id: "hub-playing",
		options: OWN_BAR,
		Screen: () => <FixtureHub hub={hub()} playing />,
		title: "A hub's listen, playing",
	},
	{
		id: "hub-free",
		options: OWN_BAR,
		Screen: () => <FixtureHub hub={hub()} locked />,
		title: "A hub's listen, free listener",
	},
	{
		id: "hub-gone",
		options: OWN_BAR,
		Screen: () => <FixtureHub hub={null} />,
		title: "A hub that's been put away",
	},
	{
		id: "stories",
		options: OWN_BAR,
		Screen: () => (
			<FixtureList
				from="kind"
				items={ofKind("story")}
				title={COPY.kinds.story.label}
			/>
		),
		title: "Stories",
	},
	{
		id: "kind-empty",
		options: OWN_BAR,
		Screen: () => (
			<FixtureList from="kind" items={[]} title={COPY.kinds.advice.label} />
		),
		title: "A kind with nothing in it",
	},
	{
		id: "a-z",
		options: OWN_BAR,
		Screen: () => <FixtureSubjects />,
		title: "A–Z",
	},
	{
		id: "a-z-l",
		options: OWN_BAR,
		Screen: () => <FixtureSubjects letter="L" />,
		title: "A–Z at L",
	},
	{
		id: "saved",
		options: OWN_BAR,
		Screen: () => (
			<FixtureList
				empty={COPY.lists.savedEmpty}
				from="saved"
				items={SAVED}
				title={COPY.lists.saved}
			/>
		),
		title: "Saved",
	},
	{
		id: "saved-empty",
		options: OWN_BAR,
		Screen: () => (
			<FixtureList
				empty={COPY.lists.savedEmpty}
				from="saved"
				items={[]}
				title={COPY.lists.saved}
			/>
		),
		title: "Saved, nothing yet",
	},
];
