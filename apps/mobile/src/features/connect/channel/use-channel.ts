import {
	XOLACE_BROADCAST_CHANNEL_TYPE,
	XOLACE_CHANNEL_ID,
} from "@xolace/backend/convex/lib/streamSetup";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { playSoftPress } from "@/lib/haptics";
import { useStreamConnection } from "@/lib/stream-chat/stream-chat-provider";
import { CHAT_HELP_HREF } from "../chat-rules";
import { useLocalChannelState } from "../thread/use-thread-channel";
import type { ChannelScreenData } from "./channel-data";
import { channelState } from "./channel-model";

export function useChannel(): ChannelScreenData {
	const stream = useStreamConnection();
	const router = useRouter();
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
		actions: {
			openHelp: () => {
				playSoftPress();
				router.push(CHAT_HELP_HREF);
			},
			retry: stream.retry,
		},
		state: channelState(stream.status, ready, channel),
	};
}
