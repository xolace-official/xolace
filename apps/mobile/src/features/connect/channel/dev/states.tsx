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

const BADGES: DevMessage = {
	ago: 2 * DAY_MIN,
	mine: false,
	text: "Badges are here\n\nEverything you did before today counts. Have a look in You.",
};

/** The prototype's two posts, newest last. */
const POSTS: DevMessage[] = [
	BADGES,
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

/** A post the broadcaster removed, and one they edited, between the two. */
const CHANGED: DevMessage[] = [
	{ ...BADGES, ago: 3 * DAY_MIN },
	{
		ago: 2 * DAY_MIN,
		deleted: true,
		mine: false,
		reactions: [{ count: 5, type: "hug" }],
		text: "Testing, testing.",
	},
	{
		ago: DAY_MIN,
		edited: true,
		mine: false,
		reactions: [{ count: 7, type: "thanks" }],
		text: "Quiet hours\n\nFrom tonight, nudges wait until morning if you've set a Quiet Window.",
	},
];

/** Posts with links and markdown, as Stream renders them on a card. */
const FORMATTED: DevMessage[] = [
	BADGES,
	{
		ago: 90,
		mine: false,
		reactions: [{ count: 18, type: "growth" }],
		text: "**Quiet hours** are here\n\nFrom tonight, nudges wait until _morning_ if you've set a Quiet Window. **Nothing urgent ever waits.** Read [how it works](https://xolace.app/quiet), or open the new hub at https://xolace.app/lantern",
	},
];

/** The broadcaster's own post that didn't reach Stream, under one that did. */
const NOT_SENT: DevMessage[] = [
	...POSTS,
	{
		ago: 2,
		failed: true,
		mine: true,
		text: "Lantern is down for ten minutes\n\nWe're moving it to a faster server. Back by 9.",
	},
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
		id: "channel-changed",
		options: CHANNEL,
		Screen: () => <FixtureChannel posts={CHANGED} />,
		title: "Xolace channel: a removed post and an edited one",
	},
	{
		id: "channel-formatted",
		options: CHANNEL,
		Screen: () => <FixtureChannel posts={FORMATTED} />,
		title: "Xolace channel: links and bold in a post",
	},
	{
		id: "channel-not-sent",
		options: CHANNEL,
		Screen: () => <FixtureChannel canPost posts={NOT_SENT} />,
		title: "Xolace channel as the broadcaster: a post that didn't send",
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
		Screen: () => <FixtureChannel stream="connecting" />,
		title: "Xolace channel while Stream connects",
	},
	{
		id: "channel-unavailable",
		options: CHANNEL,
		Screen: () => <FixtureChannel stream="unavailable" />,
		title: "Xolace channel when messages can't load",
	},
];
