import type { api } from "@xolace/backend/api";
import { isSpecialty } from "@xolace/backend/convex/lib/specialties";
import type { FunctionReturnType } from "convex/server";
import type { ConnectRoute, ConnectState } from "./connect-data";
import {
	archivedCount,
	type Clock,
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

export function routedSegment(route: ConnectRoute): Segment | null {
	if (isSpecialty(route.specialty)) {
		return "xolacers";
	}
	return route.view === "chats" || route.view === "xolacers"
		? route.view
		: null;
}

export function routedFilter(
	route: ConnectRoute,
	current: string | null
): string | null {
	if (isSpecialty(route.specialty)) {
		return route.specialty;
	}
	return routedSegment(route) === "xolacers" ? null : current;
}

export const routeKey = (route: ConnectRoute) =>
	`${route.specialty ?? ""}|${route.view ?? ""}|${route.navToken ?? ""}`;

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
	clock?: Clock;
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
		rows: chatRows(conversations, i.stream, i.now, i.clock),
		segment: landingSegment(i.picked, conversations),
		setupBanner: status.isXolacer && !status.xolacerProfileComplete,
	};
}
