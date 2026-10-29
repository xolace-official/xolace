import { XolaceChannelScreen } from "@/features/xolacer-chat/components/xolace-channel-screen";

/** Direct route to the fixed Xolace channel (#375), the only way in for now. No layout in
 * between, as with `chat/[conversationId]`. */
export default function XolaceChannelRoute() {
	return <XolaceChannelScreen />;
}
