import type { DevState } from "@/dev/dev-state";
import { FixtureKeptSheet, FixtureStyleSheet } from "./fixture-sheets";
import { FixtureTalk } from "./fixture-talk";
import { HELP, START_ERROR, WEEK } from "./fixtures";

const OWN_HEADER = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "start",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk micAsk />,
		title: "Start, first talk (Flux, Vesper)",
	},
	{
		id: "start-locked",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk locked />,
		title: "Start, free: Unlock with Xolace+",
	},
	{
		id: "look-moss",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk look="moss" micAsk />,
		title: "Moss landed",
	},
	{
		id: "voice-sample",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk look="dusk" micAsk step="sample" voice="wren" />,
		title: "Wren’s sample playing, Dusk",
	},
	{
		id: "how-ember-talks",
		options: OWN_HEADER,
		Screen: FixtureStyleSheet,
		title: "How Ember talks",
	},
	{
		id: "whats-kept",
		options: OWN_HEADER,
		Screen: () => <FixtureKeptSheet />,
		title: "What’s kept",
	},
	{
		id: "mic-ask",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk micAsk step="begin" />,
		title: "The mic ask (first talk, the system alert)",
	},
	{
		id: "start-to-talk",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk step="begin" />,
		title: "Start → talk, opening in Companion",
	},
	{
		id: "companion-speaking",
		options: OWN_HEADER,
		Screen: () => (
			<FixtureTalk seed={{ holdMs: 6000, presence: "Speaking", shown: 3 }} />
		),
		title: "Companion view, Ember speaking",
	},
	{
		id: "conversation",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk seed={{ shown: 4 }} view="conversation" />,
		title: "Conversation view",
	},
	{
		id: "wrap-up",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk seed={{ late: true, shown: 3 }} />,
		title: "The wrap-up clock",
	},
	{
		id: "menu",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk seed={{ shown: 3 }} />,
		title: "Mid-talk: open the ⋯ menu",
	},
	{
		id: "leaving",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk seed={{ shown: 3 }} step="leave" />,
		title: "Leaving",
	},
	{
		id: "help",
		options: OWN_HEADER,
		Screen: () => (
			<FixtureTalk help={HELP.elevated} look="theme" seed={{ shown: 3 }} />
		),
		title: "Help at elevated",
	},
	{
		id: "help-crisis",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk help={HELP.crisis} seed={{ shown: 3 }} />,
		title: "Help at crisis: people who can help",
	},
	{
		id: "no-time",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk week={WEEK.low} />,
		title: "No time left",
	},
	{
		id: "coming-back",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk look="ember" voice="ash" week={WEEK.some} />,
		title: "Coming back: 12 min left, Marigold, Ash",
	},
	{
		id: "opened-in-conversation",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk step="begin" view="conversation" />,
		title: "Opened in Conversation: the face into the pill",
	},
	{
		id: "could-not-start",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk error={START_ERROR} />,
		title: "A talk that couldn’t start",
	},
	{
		id: "ending",
		options: OWN_HEADER,
		Screen: () => <FixtureTalk seed={{ presence: "Ending…", shown: 5 }} />,
		title: "Ending…",
	},
];
