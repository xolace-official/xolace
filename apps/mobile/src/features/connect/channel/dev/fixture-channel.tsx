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
import { ChannelProvider, type ChannelState } from "../channel-data";
import { ChannelScreen } from "../channel-screen";

const XOLACE = { id: "xolace_broadcaster", name: "Xolace" };
const noop = () => undefined;

export function FixtureChannel({
	posts = [],
	body = "messages",
	online = true,
	canPost = false,
}: {
	posts?: readonly DevMessage[];
	body?: ChannelState["body"];
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
					actions: { retry: noop },
					state: { body, channel: body === "messages" ? channel : null },
				}}
			>
				<ChannelScreen />
			</ChannelProvider>
		</DevChat>
	);
}
