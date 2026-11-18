/** A thread and a profile on fixtures: Maya, from the prototype, as production rows. */
import type { Id } from "@xolace/backend/dataModel";
import { NOW, PEOPLE } from "../../dev/fixtures";
import type { Profile } from "../../xolacer/xolacer-model";
import type { ThreadConversation } from "../thread-model";

const DAY = 86_400_000;
export const MINUTE = 60_000;

const convo = (id: string) => id as Id<"xolacer_conversations">;

export const OPEN: ThreadConversation = {
	canRate: false,
	closedReason: undefined,
	counterpartName: "Maya",
	counterpartPhotoUrl: undefined,
	counterpartPresent: true,
	counterpartProfileId: PEOPLE.maya,
	id: convo("c_maya"),
	lastMessageAt: NOW,
	myRating: undefined,
	origin: undefined,
	requestedAt: NOW - 10 * DAY,
	restingReason: undefined,
	resumable: false,
	role: "user",
	status: "open",
	streamChannelId: "dev-thread-maya",
};

export const REQUESTED: ThreadConversation = {
	...OPEN,
	counterpartPresent: false,
	lastMessageAt: undefined,
	status: "requested",
	streamChannelId: undefined,
};

export const INCOMING: ThreadConversation = {
	...REQUESTED,
	counterpartName: "Camper 7K2F",
	counterpartPresent: true,
	origin: "suggestion",
	role: "xolacer",
};

export const RESTING: ThreadConversation = {
	...OPEN,
	canRate: true,
	lastMessageAt: NOW - 18 * DAY,
	restingReason: undefined,
	resumable: true,
	status: "resting",
};

/** Blocked or stepped back: the same bar for every reason. */
export const CLOSED: ThreadConversation = {
	...OPEN,
	canRate: true,
	closedReason: "blocked",
	myRating: 4,
	status: "closed",
};

export const DECLINED: ThreadConversation = {
	...REQUESTED,
	closedReason: "declined",
	status: "closed",
};

export const PROFILE_MAYA: Profile = {
	available: true,
	bio: "I've had the 3am kind of anxious. I won't try to fix it, I'll just stay with you in it.",
	canRate: false,
	conversation: null,
	displayName: "Maya",
	isSelf: false,
	myRating: undefined,
	photoUrl: undefined,
	present: true,
	rating: 4.9,
	ratingCount: 32,
	specialties: ["anxiety", "sleep", "studies"],
	xolacerProfileId: PEOPLE.maya,
	xolacerSince: new Date(2026, 2, 3).getTime(),
};

export const PROFILE_KOJO: Profile = {
	...PROFILE_MAYA,
	bio: "Lost my dad last year. Happy to talk about the parts nobody asks about.",
	displayName: "Kojo",
	present: false,
	rating: undefined,
	ratingCount: 2,
	specialties: ["grief", "family"],
	xolacerProfileId: PEOPLE.kojo,
	xolacerSince: new Date(2025, 8, 20).getTime(),
};
