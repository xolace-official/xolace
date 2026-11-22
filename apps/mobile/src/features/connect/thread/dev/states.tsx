import type { DevState } from "@/dev/dev-state";
import type { DevMessage } from "./dev-messages";
import { FixtureThread } from "./fixture-thread";
import {
	CLOSED,
	DECLINED,
	INCOMING,
	OPEN,
	REQUESTED,
	RESTING,
} from "./thread-fixtures";

const THREAD = {
	headerBackButtonDisplayMode: "minimal" as const,
	headerLargeTitle: false,
	headerShadowVisible: false,
	headerShown: true,
	title: "",
};
const DAY_MIN = 1440;
const DAY_MS = DAY_MIN * 60_000;
const AWAY = { ...OPEN, counterpartName: "Oluwaseun Adebayo-Williamson" };

const TONIGHT: DevMessage[] = [
	{
		ago: 9,
		mine: true,
		text: "Sunday nights are the worst. I start dreading Monday around six.",
	},
	{
		ago: 8,
		mine: false,
		text: "Same. Mine start around six too. What does the dread feel like for you?",
	},
	{
		ago: 6,
		mine: true,
		reaction: "love",
		text: "Like I'm already behind before it starts.",
	},
	{
		ago: 4,
		mine: false,
		text: "That sounds like a lot to carry into a Monday.",
	},
];
const LONG: DevMessage[] = [
	...[6, 5, 4, 3, 2].flatMap((d) => [
		{
			ago: d * DAY_MIN + 40,
			mine: true,
			text: "Couldn't sleep again. My head just keeps running the list.",
		},
		{
			ago: d * DAY_MIN + 30,
			mine: false,
			text: "I know that list. What's at the top of it tonight?",
		},
		{
			ago: d * DAY_MIN + 20,
			mine: true,
			text: "Mostly the presentation. And whether I'm even good at this job.",
		},
		{
			ago: d * DAY_MIN + 10,
			mine: false,
			reaction: "hug",
			text: "Both of those are heavy at 2am. They usually look smaller by lunch.",
		},
	]),
	...TONIGHT,
];

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "thread",
		options: THREAD,
		Screen: () => <FixtureThread conversation={OPEN} messages={TONIGHT} />,
		title: "Thread: tonight, a reaction, here now",
	},
	{
		id: "thread-long",
		options: THREAD,
		Screen: () => <FixtureThread conversation={OPEN} messages={LONG} />,
		title: "Thread: a long week of messages",
	},
	{
		id: "thread-typing",
		options: THREAD,
		Screen: () => (
			<FixtureThread conversation={OPEN} messages={TONIGHT} typing />
		),
		title: "Thread: Maya typing",
	},
	{
		id: "thread-typing-live",
		options: THREAD,
		Screen: () => (
			<FixtureThread conversation={OPEN} liveTyping messages={TONIGHT} />
		),
		title: "Thread: Maya typing on and off",
	},
	{
		id: "thread-away-long-name",
		options: THREAD,
		Screen: () => (
			<FixtureThread
				conversation={AWAY}
				lastHere={3 * DAY_MS}
				liveTyping
				messages={TONIGHT}
			/>
		),
		title: "Thread: a long name, last here 3 days ago, typing on and off",
	},
	{
		id: "thread-failed-send",
		options: THREAD,
		Screen: () => (
			<FixtureThread
				conversation={OPEN}
				messages={[
					...TONIGHT,
					{ ago: 1, failed: true, mine: true, text: "Thank you. Really." },
				]}
			/>
		),
		title: "Thread: a message that didn't send",
	},
	{
		id: "thread-offline",
		options: THREAD,
		Screen: () => (
			<FixtureThread conversation={OPEN} messages={TONIGHT} online={false} />
		),
		title: "Thread offline",
	},
	{
		id: "thread-requested",
		options: THREAD,
		Screen: () => <FixtureThread conversation={REQUESTED} />,
		title: "Thread: your request, waiting",
	},
	{
		id: "thread-incoming",
		options: THREAD,
		Screen: () => <FixtureThread conversation={INCOMING} />,
		title: "Thread as a Xolacer: a request to accept",
	},
	{
		id: "thread-resting",
		options: THREAD,
		Screen: () => <FixtureThread conversation={RESTING} messages={LONG} />,
		title: "Thread resting: pick it back up, rate",
	},
	{
		id: "thread-blocked",
		options: THREAD,
		Screen: () => <FixtureThread conversation={CLOSED} messages={TONIGHT} />,
		title: "Thread closed (blocked or stepped back): one bar for every reason",
	},
	{
		id: "thread-declined",
		options: THREAD,
		Screen: () => <FixtureThread conversation={DECLINED} />,
		title: "Thread: a declined request",
	},
	{
		id: "thread-connecting",
		options: THREAD,
		Screen: () => <FixtureThread conversation={OPEN} stream="connecting" />,
		title: "Thread: Stream connecting",
	},
	{
		id: "thread-unavailable",
		options: THREAD,
		Screen: () => <FixtureThread conversation={OPEN} stream="unavailable" />,
		title: "Thread: messages couldn't load",
	},
	{
		id: "thread-loading",
		options: THREAD,
		Screen: () => <FixtureThread conversation={OPEN} phase="loading" />,
		title: "Thread loading",
	},
	{
		id: "thread-gone",
		options: THREAD,
		Screen: () => <FixtureThread conversation={OPEN} phase="gone" />,
		title: "Thread that isn't yours or isn't there",
	},
];
