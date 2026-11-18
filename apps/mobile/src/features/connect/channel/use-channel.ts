/**
 * The Xolace channel on Stream: the fixed broadcast channel every camper belongs to (#372-#375),
 * no conversation row behind it. Production's connection, local state and retry.
 */
import {
	XOLACE_BROADCAST_CHANNEL_TYPE,
	XOLACE_CHANNEL_ID,
} from "@xolace/backend/convex/lib/streamSetup";
import { useMemo } from "react";
import { useStreamConnection } from "@/lib/stream-chat/stream-chat-provider";
import { useLocalChannelState } from "../thread/use-thread-channel";
import type { ChannelScreenData } from "./channel-data";
import { channelBody } from "./channel-model";

export function useChannel(): ChannelScreenData {
	// Usually a no-op (Connect already connected); matters for a push deep link or a cold launch.
	const stream = useStreamConnection();
	// Stable identity is correctness, not speed: `<Channel>` treats a new instance as a new
	// channel, so this memo stays despite the React Compiler.
	const channel = useMemo(
		() =>
			stream.client
				? stream.client.channel(
						XOLACE_BROADCAST_CHANNEL_TYPE,
						XOLACE_CHANNEL_ID
					)
				: null,
		[stream.client]
	);
	const ready = useLocalChannelState(channel);
	return {
		actions: { retry: stream.retry },
		state: {
			body: channelBody(stream.status, ready),
			channel: ready ? channel : null,
		},
	};
}
