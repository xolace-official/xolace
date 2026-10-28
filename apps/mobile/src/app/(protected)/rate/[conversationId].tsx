import { useLocalSearchParams } from "expo-router";
import { RateConversationScreen } from "@/features/xolacer-chat/components/rate-conversation-screen";

export default function RateConversationRoute() {
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	return <RateConversationScreen conversationId={conversationId} />;
}
