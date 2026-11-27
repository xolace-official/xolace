import { useLocalSearchParams } from "expo-router";
import { RateData } from "@/features/connect/rate/rate-data";
import { RateScreen } from "@/features/connect/rate/rate-screen";

export default function RateConversationRoute() {
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	return (
		<RateData conversationId={conversationId}>
			<RateScreen />
		</RateData>
	);
}
