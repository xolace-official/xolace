import { ChannelData } from "@/features/connect/channel/channel-data";
import { ChannelScreen } from "@/features/connect/channel/channel-screen";

export default function XolaceChannelRoute() {
	return (
		<ChannelData>
			<ChannelScreen />
		</ChannelData>
	);
}
