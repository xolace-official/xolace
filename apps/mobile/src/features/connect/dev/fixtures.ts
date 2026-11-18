/** Connect on fixtures: the prototype's people (Maya, Kojo, Esi) as production rows. Feeds the
 * dev states and the model tests. */
import type { Id } from "@xolace/backend/dataModel";
import type { ChatStatus } from "../connect-model";
import type {
	ConversationRow,
	PairConversation,
	StreamSnapshot,
} from "../list/chats-model";
import type { DirectoryRow } from "../roster/roster-model";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** 9:41 pm on a Sunday, so "Tue" and "Oct 28" land as the board drew them. */
export const NOW = new Date(2026, 10, 15, 21, 41).getTime();

const profile = (id: string) => id as Id<"emotional_profiles">;
const convo = (id: string) => id as Id<"xolacer_conversations">;

export const PEOPLE = {
	ade: profile("profile_ade"),
	esi: profile("profile_esi"),
	kojo: profile("profile_kojo"),
	maya: profile("profile_maya"),
	ren: profile("profile_ren"),
};

const pair = (
	over: Partial<PairConversation> & Pick<PairConversation, "id">
): PairConversation =>
	// The row type is a union by role; a fixture names its role in `over`.
	({
		archived: false,
		closedReason: undefined,
		counterpartName: "Maya",
		counterpartPhotoUrl: undefined,
		counterpartPresent: false,
		counterpartProfileId: PEOPLE.maya,
		kind: "pair",
		lastMessageAt: undefined,
		origin: undefined,
		requestedAt: NOW - 10 * DAY,
		restingReason: undefined,
		role: "user",
		status: "open",
		streamChannelId: undefined,
		xolacerProfileId: PEOPLE.maya,
		...over,
	}) as PairConversation;

/** `status` for someone who isn't a Xolacer, and the Xolacer variants. */
export const SEEKER: ChatStatus = {
	enabled: true,
	isXolacer: false,
	myProfileId: profile("profile_me"),
	xolacerActive: false,
	xolacerProfileComplete: false,
};
export const XOLACER: ChatStatus = {
	...SEEKER,
	isXolacer: true,
	xolacerActive: true,
	xolacerProfileComplete: true,
};
export const XOLACER_PAUSED: ChatStatus = { ...XOLACER, xolacerActive: false };
export const XOLACER_UNPUBLISHED: ChatStatus = {
	...XOLACER,
	xolacerProfileComplete: false,
};

export const CHANNEL_ROW: ConversationRow = {
	channelType: "xolace_broadcast",
	id: "xolace",
	kind: "broadcast",
	lastMessageAt: NOW - 2 * HOUR,
	lastMessageText: "A new Lantern hub is open",
	streamChannelId: "xolace",
};

export const MAYA = pair({
	counterpartPresent: true,
	id: convo("c_maya"),
	lastMessageAt: NOW,
	streamChannelId: "ch_maya",
});
export const KOJO = pair({
	counterpartName: "Kojo",
	counterpartProfileId: PEOPLE.kojo,
	id: convo("c_kojo"),
	requestedAt: NOW - 5 * DAY,
	status: "requested",
	xolacerProfileId: PEOPLE.kojo,
});
export const ESI = pair({
	counterpartName: "Esi",
	counterpartProfileId: PEOPLE.esi,
	id: convo("c_esi"),
	lastMessageAt: NOW - 18 * DAY,
	status: "resting",
	streamChannelId: "ch_esi",
	xolacerProfileId: PEOPLE.esi,
});
export const ADE_DECLINED = pair({
	archived: true,
	closedReason: "declined",
	counterpartName: "Ade",
	counterpartProfileId: PEOPLE.ade,
	id: convo("c_ade"),
	requestedAt: NOW - 30 * DAY,
	status: "closed",
	xolacerProfileId: PEOPLE.ade,
});
export const REN_ARCHIVED = pair({
	archived: true,
	counterpartName: "Ren",
	counterpartProfileId: PEOPLE.ren,
	id: convo("c_ren"),
	lastMessageAt: NOW - 40 * DAY,
	restingReason: "manual",
	status: "resting",
	streamChannelId: "ch_ren",
	xolacerProfileId: PEOPLE.ren,
});
/** A request to a Xolacer, seen from the Xolacer's side. */
export const SEEKER_REQUEST = pair({
	counterpartName: "Camper 7K2F",
	counterpartProfileId: profile("profile_seeker"),
	id: convo("c_seeker"),
	origin: "suggestion",
	requestedAt: NOW - 3 * HOUR,
	role: "xolacer",
	status: "requested",
	xolacerProfileId: profile("profile_me"),
});
/** A seeker asked this Xolacer directly, from the roster. */
export const DIRECT_REQUEST = pair({
	counterpartName: "Camper 3QJ9",
	counterpartProfileId: profile("profile_direct"),
	id: convo("c_direct"),
	requestedAt: NOW - 40 * 60_000,
	role: "xolacer",
	status: "requested",
	xolacerProfileId: profile("profile_me"),
});

export const CONVERSATIONS: ConversationRow[] = [
	CHANNEL_ROW,
	MAYA,
	KOJO,
	ESI,
	ADE_DECLINED,
	REN_ARCHIVED,
];
export const ARCHIVED_ONLY: ConversationRow[] = [
	CHANNEL_ROW,
	ADE_DECLINED,
	REN_ARCHIVED,
];
export const NO_CHATS: ConversationRow[] = [CHANNEL_ROW];

export const STREAM: StreamSnapshot = {
	ch_esi: { lastText: "Thanks for tonight.", unread: 0 },
	ch_maya: {
		lastText: "That sounds like a lot to carry into a Monday.",
		unread: 2,
	},
	xolace: { unread: 1 },
};

const xolacer = (
	over: Partial<DirectoryRow> & Pick<DirectoryRow, "xolacerProfileId">
): DirectoryRow => ({
	atCapacity: false,
	bio: "",
	displayName: "Maya",
	photoUrl: undefined,
	present: false,
	rating: undefined,
	ratingCount: 0,
	specialties: [],
	xolacerSince: NOW - 200 * DAY,
	...over,
});

export const DIRECTORY: DirectoryRow[] = [
	xolacer({
		bio: "I've had the 3am kind of anxious. I won't try to fix it, I'll just stay with you in it.",
		present: true,
		rating: 4.9,
		ratingCount: 32,
		specialties: ["anxiety", "sleep", "studies"],
		xolacerProfileId: PEOPLE.maya,
	}),
	xolacer({
		bio: "Lost my dad last year. Happy to talk about the parts nobody asks about.",
		displayName: "Kojo",
		ratingCount: 2,
		specialties: ["grief", "family"],
		xolacerProfileId: PEOPLE.kojo,
	}),
	xolacer({
		atCapacity: true,
		bio: "Loneliness lies about how many people would want to hear from you.",
		displayName: "Esi",
		rating: 4.8,
		ratingCount: 19,
		specialties: ["loneliness", "studies"],
		xolacerProfileId: PEOPLE.esi,
	}),
];
