/**
 * Connect on Convex and Stream: production's `status`, `myConversations` and `directory`, the
 * Stream warm-up and each channel's unread and last message, the routed params, and the row
 * actions. Same behaviour as the old screen; only the look moved.
 */
import { api } from "@xolace/backend/api";
import { isSpecialty } from "@xolace/backend/convex/lib/specialties";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import type { ConnectRoute, ConnectScreenData } from "./connect-data";
import {
	archivedCount,
	chatRows,
	chatsEmpty,
	landingSegment,
	type Segment,
} from "./list/chats-model";
import { filterChips, rosterCards } from "./roster/roster-model";
import { usePresenceSnapshot } from "./roster/use-presence-snapshot";
import { useChatWarmup } from "./use-chat-warmup";
import { useRowActions } from "./use-row-actions";
import { useStreamSnapshot } from "./use-stream-snapshot";

const routedSegment = (route: ConnectRoute): Segment | null => {
	if (isSpecialty(route.specialty)) {
		return "xolacers";
	}
	return route.view === "chats" || route.view === "xolacers"
		? route.view
		: null;
};

export function useConnect(route: ConnectRoute): ConnectScreenData {
	const router = useRouter();
	const status = useQuery(api.xolacerChat.status);
	const conversations = useQuery(api.xolacerChat.myConversations);
	const [picked, setPicked] = useState<Segment | null>(routedSegment(route));
	const [filter, setFilter] = useState<string | null>(
		isSpecialty(route.specialty) ? route.specialty : null
	);
	const { actions: rowActions, deleting } = useRowActions();

	// Route params are latched and re-applied when they change: the tab stays mounted across
	// navigations, and `navToken` differs per tap so a second tap for the same segment lands.
	const routed = `${route.specialty ?? ""}|${route.view ?? ""}|${route.navToken ?? ""}`;
	const [seen, setSeen] = useState(routed);
	if (routed !== seen) {
		setSeen(routed);
		const segment = routedSegment(route);
		if (isSpecialty(route.specialty)) {
			setFilter(route.specialty);
		} else if (segment === "xolacers") {
			// A decline sends here without a specialty; a leftover filter would answer with a
			// narrowed, maybe empty list.
			setFilter(null);
		}
		if (segment) {
			setPicked(segment);
		}
	}

	const enabled = status?.enabled ?? false;
	// Opens the connection and watches the listed channels once `status` says chat is on.
	useChatWarmup(conversations, enabled);
	const stream = useStreamSnapshot(
		(conversations ?? []).flatMap((c) =>
			c.kind === "broadcast"
				? [{ id: c.streamChannelId, type: c.channelType }]
				: c.streamChannelId
					? [{ id: c.streamChannelId, type: "messaging" }]
					: []
		)
	);

	const segment = landingSegment(picked, conversations ?? []);
	const directory = useQuery(
		api.xolacerChat.directory,
		enabled && segment === "xolacers" ? {} : "skip"
	);
	const presentSnapshot = usePresenceSnapshot(directory);

	const actions: ConnectScreenData["actions"] = {
		...rowActions,
		openArchived: () => router.push("/connect/archived"),
		openMyProfile: () => {
			if (status?.enabled) {
				router.push({
					params: { profileId: status.myProfileId },
					pathname: "/xolacer/[profileId]",
				});
			}
		},
		openSetup: () => router.push("/xolacer-setup"),
		openXolacer: (card) =>
			router.push({
				params: {
					profileId: card.id,
					...(route.stepId ? { stepId: route.stepId } : {}),
				},
				pathname: "/xolacer/[profileId]",
			}),
		setFilter,
		setSegment: setPicked,
	};

	if (status === undefined || conversations === undefined) {
		return { actions, deleting, state: { phase: "loading" } };
	}
	if (!status.enabled) {
		return { actions, deleting, state: { phase: "disabled" } };
	}
	const published = status.isXolacer && status.xolacerProfileComplete;
	const now = Date.now();
	return {
		actions,
		deleting,
		state: {
			archivedCount: archivedCount(conversations),
			empty: chatsEmpty(conversations),
			myProfile: published ? { paused: !status.xolacerActive } : null,
			phase: "ready",
			roster: {
				cards:
					directory === undefined
						? undefined
						: rosterCards(directory, conversations, filter, presentSnapshot),
				filter,
				filters: filterChips(directory ?? [], filter),
			},
			rows: chatRows(conversations, stream, now),
			segment,
			setupBanner: status.isXolacer && !status.xolacerProfileComplete,
		},
	};
}
