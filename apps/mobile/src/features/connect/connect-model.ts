/** Connect's screen state from what Convex and Stream returned, and the routed params' rules.
 * Pure: the data hook and the dev states both call it, so the rules are tested once. */
import type { api } from "@xolace/backend/api";
import { isSpecialty } from "@xolace/backend/convex/lib/specialties";
import type { FunctionReturnType } from "convex/server";
import type { ConnectRoute, ConnectState } from "./connect-data";
import {
	archivedCount,
	type ConversationRow,
	chatRows,
	chatsEmpty,
	landingSegment,
	type Segment,
	type StreamSnapshot,
} from "./list/chats-model";
import {
	type DirectoryRow,
	filterChips,
	rosterCards,
} from "./roster/roster-model";

export type ChatStatus = FunctionReturnType<typeof api.xolacerChat.status>;

/** The segment a route asks for: a specialty means the roster. */
export function routedSegment(route: ConnectRoute): Segment | null {
	if (isSpecialty(route.specialty)) {
		return "xolacers";
	}
	return route.view === "chats" || route.view === "xolacers"
		? route.view
		: null;
}

/** What a new set of route params does to the filter: a specialty sets it; Xolacers without
 * one (a decline sends there) clears it, so a leftover filter can't answer with a narrowed,
 * maybe empty list; anything else keeps it. */
export function routedFilter(
	route: ConnectRoute,
	current: string | null
): string | null {
	if (isSpecialty(route.specialty)) {
		return route.specialty;
	}
	return routedSegment(route) === "xolacers" ? null : current;
}

/** Changes whenever a tap routes here, even to the same params (`navToken`). */
export const routeKey = (route: ConnectRoute) =>
	`${route.specialty ?? ""}|${route.view ?? ""}|${route.navToken ?? ""}`;

/** The directory is read only while chat is on and the roster is the segment. */
export function readsDirectory(
	status: ChatStatus | undefined,
	segment: Segment
): boolean {
	return status?.enabled === true && segment === "xolacers";
}

export type ConnectInputs = {
	status: ChatStatus | undefined;
	conversations: readonly ConversationRow[] | undefined;
	directory: readonly DirectoryRow[] | undefined;
	stream: StreamSnapshot;
	picked: Segment | null;
	filter: string | null;
	presentSnapshot: ReadonlySet<string> | null;
	now: number;
};

export function connectState(i: ConnectInputs): ConnectState {
	if (i.status === undefined || i.conversations === undefined) {
		return { phase: "loading", segment: i.picked ?? "chats" };
	}
	if (!i.status.enabled) {
		return { phase: "disabled" };
	}
	const { status, conversations, directory, filter } = i;
	const published = status.isXolacer && status.xolacerProfileComplete;
	return {
		archivedCount: archivedCount(conversations),
		empty: chatsEmpty(conversations),
		// A paused Xolacer still gets the way to their profile, with the moon.
		myProfile: published ? { paused: !status.xolacerActive } : null,
		phase: "ready",
		roster: {
			cards:
				directory === undefined
					? undefined
					: rosterCards(directory, conversations, filter, i.presentSnapshot),
			filter,
			filters: filterChips(directory ?? [], filter),
		},
		rows: chatRows(conversations, i.stream, i.now),
		segment: landingSegment(i.picked, conversations),
		setupBanner: status.isXolacer && !status.xolacerProfileComplete,
	};
}
