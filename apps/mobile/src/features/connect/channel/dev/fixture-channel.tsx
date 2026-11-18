/** The Xolace channel on fixtures, through the same provider as the app, on a Stream client that
 * never connects. A tap on a reaction reaches the fake client and goes nowhere. */
import {
	XOLACE_BROADCAST_CHANNEL_TYPE,
	XOLACE_CHANNEL_ID,
} from "@xolace/backend/convex/lib/streamSetup";
import {
	DevChat,
	type DevMessage,
	useDevChannel,
} from "../../thread/dev/dev-stream";
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
	canPost = false,
}: {
	posts?: readonly DevMessage[];
	stream?: StreamStatus;
	online?: boolean;
	canPost?: boolean;
}) {
	const { client, channel } = useDevChannel(posts, XOLACE_CHANNEL_ID, false, {
		author: XOLACE,
		canSend: canPost,
		type: XOLACE_BROADCAST_CHANNEL_TYPE,
	});
	return (
		<DevChat client={client} online={online}>
			<ChannelProvider
				value={{
					actions: { openHelp: noop, retry: noop },
					// The dev channel holds its state from the start.
					state: channelState(stream, true, channel),
				}}
			>
				<ChannelScreen />
			</ChannelProvider>
		</DevChat>
	);
}
