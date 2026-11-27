import {
	XOLACE_BROADCAST_CHANNEL_TYPE,
	XOLACE_CHANNEL_ID,
} from "@xolace/backend/convex/lib/streamSetup";
import type { Reach } from "@/lib/connection/connection-model";
import type { DevMessage } from "../../thread/dev/dev-messages";
import { DevChat, useDevChannel } from "../../thread/dev/dev-stream";
import type { StreamStatus } from "../../thread/thread-model";
import { ChannelProvider } from "../channel-data";
import { channelState } from "../channel-model";
import { ChannelScreen } from "../channel-screen";

const XOLACE = { id: "xolace_broadcaster", name: "Xolace" };
const noop = () => undefined;

export function FixtureChannel({
	posts = [],
	stream = "ready",
	online = true,
	reach,
	canPost = false,
}: {
	posts?: readonly DevMessage[];
	stream?: StreamStatus;
	online?: boolean;
	reach?: Reach;
	canPost?: boolean;
}) {
	const { client, channel } = useDevChannel(posts, XOLACE_CHANNEL_ID, false, {
		author: XOLACE,
		canSend: canPost,
		type: XOLACE_BROADCAST_CHANNEL_TYPE,
	});
	return (
		<DevChat client={client} online={online} reach={reach}>
			<ChannelProvider
				value={{
					actions: { openHelp: noop, retry: noop },
					state: channelState(stream, true, channel),
				}}
			>
				<ChannelScreen />
			</ChannelProvider>
		</DevChat>
	);
}
