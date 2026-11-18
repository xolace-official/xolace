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
	connectState,
	readsDirectory,
	routedFilter,
	routedSegment,
	routeKey,
} from "./connect-model";
import { deviceClock } from "./device-clock";
import { landingSegment, type Segment } from "./list/chats-model";
import { usePresenceSnapshot } from "./roster/use-presence-snapshot";
import { useChatWarmup } from "./use-chat-warmup";
import { useRowActions } from "./use-row-actions";
import { useStreamSnapshot } from "./use-stream-snapshot";

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
	const routed = routeKey(route);
	const [seen, setSeen] = useState(routed);
	if (routed !== seen) {
		setSeen(routed);
		setFilter(routedFilter(route, filter));
		const segment = routedSegment(route);
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
		readsDirectory(status, segment) ? {} : "skip"
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

	return {
		actions,
		deleting,
		state: connectState({
			clock: deviceClock(),
			conversations,
			directory,
			filter,
			now: Date.now(),
			picked,
			presentSnapshot,
			status,
			stream,
		}),
	};
}
