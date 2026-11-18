import { ChannelData } from "@/features/connect/channel/channel-data";
import { ChannelScreen } from "@/features/connect/channel/channel-screen";

/** The fixed Xolace channel (#375). No layout in between, as with `chat/[conversationId]`. */
export default function XolaceChannelRoute() {
	return (
		<ChannelData>
			<ChannelScreen />
		</ChannelData>
	);
}
