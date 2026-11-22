import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { deviceClock } from "../device-clock";
import { archivedRows } from "../list/chats-model";
import { useRowActions } from "../use-row-actions";
import { useStreamSnapshot } from "../use-stream-snapshot";
import type { ArchivedScreenData } from "./archived-data";

export function useArchived(): ArchivedScreenData {
	const conversations = useQuery(api.xolacerChat.myConversations);
	const { actions, deleting } = useRowActions();
	const stream = useStreamSnapshot(
		(conversations ?? []).flatMap((c) =>
			c.kind === "pair" && c.archived && c.streamChannelId
				? [{ id: c.streamChannelId, type: "messaging" }]
				: []
		)
	);
	return {
		actions,
		deleting,
		state: {
			rows:
				conversations === undefined
					? undefined
					: archivedRows(conversations, stream, Date.now(), deviceClock()),
		},
	};
}
