/**
 * What Stream's client holds for the listed channels: each one's unread count and last message,
 * re-read on every client event. Passive: it never opens the socket or watches a channel; the
 * counts exist once `useChatWarmup` has watched them (production's row badges, one subscription
 * for the whole list instead of one per row).
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import type { Channel, StreamChat } from "stream-chat";
import { useStreamStatus } from "@/lib/stream-chat/stream-chat-provider";
import type { StreamSnapshot } from "./list/chats-model";

export type ChannelRef = { type: string; id: string };

function lastText(channel: Channel): string | undefined {
	const messages = channel.state.latestMessages;
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m && m.type !== "deleted" && m.type !== "system" && m.text) {
			return m.text;
		}
	}
}

function read(client: StreamChat | null, refs: readonly ChannelRef[]) {
	const out: Record<string, { unread: number; lastText?: string }> = {};
	if (!client) {
		return out;
	}
	for (const ref of refs) {
		const channel = client.activeChannels[`${ref.type}:${ref.id}`];
		if (channel) {
			out[ref.id] = {
				lastText: lastText(channel),
				unread: channel.countUnread(),
			};
		}
	}
	return out;
}

export function useStreamSnapshot(refs: readonly ChannelRef[]): StreamSnapshot {
	const { client, status } = useStreamStatus();
	const live = status === "ready" ? client : null;
	// The last snapshot handed out, kept so an unchanged read returns the same object
	// (useSyncExternalStore re-renders on every new one).
	const [cache] = useState(() => ({ key: "{}", value: {} as StreamSnapshot }));

	// Kept despite the React Compiler, for correctness: a fresh subscribe re-registers the
	// listener every render. Client-wide on purpose: a read on another device or a message in an
	// unwatched channel never reaches a channel's own listener.
	const subscribe = useCallback(
		(onChange: () => void) => {
			if (!live) {
				return () => undefined;
			}
			const { unsubscribe } = live.on(onChange);
			return unsubscribe;
		},
		[live]
	);

	return useSyncExternalStore(subscribe, () => {
		const value = read(live, refs);
		const key = JSON.stringify(value);
		if (key !== cache.key) {
			cache.key = key;
			cache.value = value;
		}
		return cache.value;
	});
}
