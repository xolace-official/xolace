/** Explore's topics and lists on fixtures: `xolace://dev/explore/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { COPY } from "@/features/explore/copy";
import {
	FixtureList,
	FixtureTopic,
	FixtureTopics,
} from "@/features/explore/dev/fixture-screens";
import { LIST, TILES } from "@/features/explore/dev/fixtures";

/** The screens set their own bars, as their routes do. */
const OWN_BAR = { title: "" };
const EMPTY = { music: [], support: [] };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
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
