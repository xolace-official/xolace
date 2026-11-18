/** Connect on fixtures: `xolace://dev/connect/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { FixtureArchived, FixtureConnect } from "./fixture-connect";
import {
	ARCHIVED_ONLY,
	CHANNEL_ROW,
	CONVERSATIONS,
	ESI,
	KOJO,
	MAYA,
	NO_CHATS,
	SEEKER_REQUEST,
} from "./fixtures";

/** The screen sets its own header, as the tab's stack does. */
const OWN = { headerShown: true, title: "" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "chats",
		options: OWN,
		Screen: () => <FixtureConnect />,
		title: "Chats: the channel, talking, waiting, resting, Archived · 2",
	},
	{
		id: "chats-xolacer",
		options: OWN,
		Screen: () => (
			<FixtureConnect
				conversations={[CHANNEL_ROW, SEEKER_REQUEST, MAYA, KOJO, ESI]}
				myProfile={{ paused: false }}
			/>
		),
		title: "Chats as a Xolacer: a new request, the profile button",
	},
	{
		id: "chats-xolacer-setup",
		options: OWN,
		Screen: () => <FixtureConnect setupBanner />,
		title: "Chats as a Xolacer before publishing: the setup banner",
	},
	{
		id: "chats-offline",
		options: OWN,
		Screen: () => <FixtureConnect stream={{}} />,
		title: "Chats offline: Convex's rows, nothing from Stream",
	},
	{
		id: "no-chats",
		options: OWN,
		Screen: () => <FixtureConnect conversations={NO_CHATS} />,
		title: "No chats yet: the channel and a way to the roster",
	},
	{
		id: "archived-only",
		options: OWN,
		Screen: () => <FixtureConnect conversations={ARCHIVED_ONLY} />,
		title: "Every chat archived",
	},
	{
		id: "loading",
		options: OWN,
		Screen: () => <FixtureConnect phase="loading" />,
		title: "Connect loading",
	},
	{
		id: "disabled",
		options: OWN,
		Screen: () => <FixtureConnect phase="disabled" />,
		title: "Chat switched off",
	},
	{
		id: "xolacers",
		options: OWN,
		Screen: () => <FixtureConnect segment="xolacers" />,
		title: "Xolacers: here now, new, full",
	},
	{
		id: "xolacers-filtered",
		options: OWN,
		Screen: () => <FixtureConnect filter="grief" segment="xolacers" />,
		title: "Xolacers filtered to Grief",
	},
	{
		id: "xolacers-no-match",
		options: OWN,
		Screen: () => <FixtureConnect filter="burnout" segment="xolacers" />,
		title: "Xolacers filtered to a tag nobody lists",
	},
	{
		id: "xolacers-loading",
		options: OWN,
		Screen: () => <FixtureConnect directory={null} segment="xolacers" />,
		title: "Xolacers loading",
	},
	{
		id: "xolacers-empty",
		options: OWN,
		Screen: () => <FixtureConnect directory={[]} segment="xolacers" />,
		title: "No Xolacers yet",
	},
	{
		id: "archived",
		options: OWN,
		Screen: () => <FixtureArchived />,
		title: "Archived: a wrapped-up chat and a declined request",
	},
	{
		id: "archived-empty",
		options: OWN,
		Screen: () => <FixtureArchived conversations={CONVERSATIONS.slice(0, 4)} />,
		title: "Archived, nothing there",
	},
];
