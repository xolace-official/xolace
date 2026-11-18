/** The Xolace channel on fixtures: `xolace://dev/connect/<id>`. */
import type { DevState } from "@/dev/dev-state";
import type { DevMessage } from "../../thread/dev/dev-stream";
import { FixtureChannel } from "./fixture-channel";

/** The channel sets its own title; the stack gives it the minimal back button. */
const CHANNEL = {
	headerBackButtonDisplayMode: "minimal" as const,
	headerLargeTitle: false,
	headerShadowVisible: false,
	headerShown: true,
	title: "",
};
const DAY_MIN = 1440;

/** The prototype's two posts, newest last. */
const POSTS: DevMessage[] = [
	{
		ago: 2 * DAY_MIN,
		mine: false,
		text: "Badges are here\n\nEverything you did before today counts. Have a look in You.",
	},
	{
		ago: 120,
		mine: false,
		reactions: [
			{ count: 24, type: "hug" },
			{ count: 41, mine: true, type: "love" },
		],
		text: "A new Lantern hub is open\n\nEight short reads on sleep, written with people who've been up at 3am too.",
	},
];

/** A few weeks of posts, for scrolling, paging and the date separators. */
const LONG: DevMessage[] = [
	{
		ago: 21 * DAY_MIN,
		mine: false,
		reactions: [{ count: 12, type: "thanks" }],
		text: "Welcome to camp\n\nThis is where Xolace talks to everyone at once. You can't reply here, but a reaction lets us know it landed.",
	},
	{
		ago: 14 * DAY_MIN,
		mine: false,
		reactions: [
			{ count: 9, type: "growth" },
			{ count: 3, type: "fire" },
		],
		text: "Streak freezes are in. Miss a day and a freeze holds your streak; you earn them by showing up.",
	},
	{
		ago: 7 * DAY_MIN,
		mine: false,
		reactions: [{ count: 30, mine: true, type: "hug" }],
		text: "Quiet hours\n\nFrom tonight, nudges wait until morning if you've set a Quiet Window. Nothing urgent ever waits.",
	},
	...POSTS,
];

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "channel",
		options: CHANNEL,
		Screen: () => <FixtureChannel posts={POSTS} />,
		title: "Xolace channel: two posts, reactions, the lock note",
	},
	{
		id: "channel-long",
		options: CHANNEL,
		Screen: () => <FixtureChannel posts={LONG} />,
		title: "Xolace channel: a few weeks of posts",
	},
	{
		id: "channel-sender",
		options: CHANNEL,
		Screen: () => <FixtureChannel canPost posts={POSTS} />,
		title: "Xolace channel as the broadcaster: the composer",
	},
	{
		id: "channel-offline",
		options: CHANNEL,
		Screen: () => <FixtureChannel online={false} posts={POSTS} />,
		title: "Xolace channel offline",
	},
	{
		id: "channel-empty",
		options: CHANNEL,
		Screen: () => <FixtureChannel />,
		title: "Xolace channel with nothing posted yet",
	},
	{
		id: "channel-connecting",
		options: CHANNEL,
		Screen: () => <FixtureChannel body="connecting" />,
		title: "Xolace channel while Stream connects",
	},
	{
		id: "channel-unavailable",
		options: CHANNEL,
		Screen: () => <FixtureChannel body="unavailable" />,
		title: "Xolace channel when messages can't load",
	},
];
