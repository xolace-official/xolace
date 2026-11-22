import type { DevState } from "@/dev/dev-state";
import { COPY } from "@/features/explore/copy";
import { FixtureHome } from "@/features/explore/dev/fixture-home";
import {
	FixtureList,
	FixtureTopic,
	FixtureTopics,
} from "@/features/explore/dev/fixture-screens";
import { LIST, TILES } from "@/features/explore/dev/fixtures";

const OWN_BAR = { title: "" };
const EMPTY = { music: [], support: [] };
const HOME_BAR = { headerLargeTitle: true, title: "Explore" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "home",
		options: HOME_BAR,
		Screen: () => <FixtureHome />,
		title: "Home: Xolace+ member, for the day",
	},
	{
		id: "home-free",
		options: HOME_BAR,
		Screen: () => <FixtureHome locked />,
		title: "Home: returning free listener",
	},
	{
		id: "home-new",
		options: HOME_BAR,
		Screen: () => <FixtureHome fresh locked />,
		title: "Home: new member",
	},
	{
		id: "home-dawn",
		options: HOME_BAR,
		Screen: () => <FixtureHome phase="dawn" />,
		title: "Home: For this morning",
	},
	{
		id: "home-evening",
		options: HOME_BAR,
		Screen: () => <FixtureHome phase="evening" />,
		title: "Home: For this evening",
	},
	{
		id: "home-late",
		options: HOME_BAR,
		Screen: () => <FixtureHome phase="late" />,
		title: "Home: For the small hours",
	},
	{
		id: "home-no-sessions",
		options: HOME_BAR,
		Screen: () => <FixtureHome noSessions />,
		title: "Home: Don’t use my sessions here",
	},
	{
		id: "home-playing",
		options: HOME_BAR,
		Screen: () => <FixtureHome playing="dev-letting" />,
		title: "Home: Continue's track playing",
	},
	{
		id: "home-picked",
		options: HOME_BAR,
		Screen: () => <FixtureHome startPicked />,
		title: "Home: Choose for me, picked",
	},
	{
		id: "home-hearing",
		options: HOME_BAR,
		Screen: () => <FixtureHome hearing="hour:dev-clear" />,
		title: "Home: Hold to hear (not in the app yet)",
	},
	{
		id: "home-loading",
		options: HOME_BAR,
		Screen: () => <FixtureHome loading />,
		title: "Home: loading",
	},
	{
		id: "topics",
		options: OWN_BAR,
		Screen: () => <FixtureTopics topics={TILES} />,
		title: "Topics",
	},
	{
		id: "topics-loading",
		options: OWN_BAR,
		Screen: () => <FixtureTopics topics={undefined} />,
		title: "Topics, loading",
	},
	{
		id: "topics-empty",
		options: OWN_BAR,
		Screen: () => <FixtureTopics topics={[]} />,
		title: "Topics, none published",
	},
	{
		id: "support",
		options: OWN_BAR,
		Screen: () => <FixtureList first="support" lists={LIST} />,
		title: COPY.family.support,
	},
	{
		id: "music",
		options: OWN_BAR,
		Screen: () => <FixtureList first="music" lists={LIST} />,
		title: COPY.family.music,
	},
	{
		id: "list-free",
		options: OWN_BAR,
		Screen: () => <FixtureList first="support" lists={LIST} locked />,
		title: "Support audio, free listener",
	},
	{
		id: "list-more",
		options: OWN_BAR,
		Screen: () => <FixtureList first="music" lists={LIST} loadingMore />,
		title: "Music, the next page loading",
	},
	{
		id: "list-loading",
		options: OWN_BAR,
		Screen: () => <FixtureList first="support" lists={undefined} />,
		title: "A list, loading",
	},
	{
		id: "list-empty",
		options: OWN_BAR,
		Screen: () => <FixtureList first="music" lists={EMPTY} />,
		title: "A list, empty",
	},
	{
		id: "topic",
		options: OWN_BAR,
		Screen: () => <FixtureTopic slug="sleep" />,
		title: "A topic: Sleep, All",
	},
	{
		id: "topic-music",
		options: OWN_BAR,
		Screen: () => <FixtureTopic family="music" slug="sleep" />,
		title: "Sleep, Music (?family=music)",
	},
	{
		id: "topic-support",
		options: OWN_BAR,
		Screen: () => <FixtureTopic family="support" slug="sleep" />,
		title: "Sleep, Support audio (?family=support)",
	},
	{
		id: "calm-music-only",
		options: OWN_BAR,
		Screen: () => <FixtureTopic slug="calm" />,
		title: "Calm: music only, no chips",
	},
	{
		id: "self-worth-spoken-only",
		options: OWN_BAR,
		Screen: () => <FixtureTopic slug="self-worth" />,
		title: "Self-worth: spoken only, no chips",
	},
	{
		id: "topic-free",
		options: OWN_BAR,
		Screen: () => <FixtureTopic locked slug="sleep" />,
		title: "Sleep, free listener",
	},
	{
		id: "episode-playing",
		options: OWN_BAR,
		Screen: () => <FixtureTopic playing="dev-letting" slug="sleep" />,
		title: "Sleep, episode 2 playing",
	},
	{
		id: "topic-loading",
		options: OWN_BAR,
		Screen: () => <FixtureTopic slug={undefined} />,
		title: "A topic, loading",
	},
	{
		id: "topic-gone",
		options: OWN_BAR,
		Screen: () => <FixtureTopic slug={null} />,
		title: "A topic that isn’t published",
	},
];
