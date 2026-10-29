import { useLocalSearchParams } from "expo-router";
import { ThreadScreen } from "@/features/xolacer-chat/components/thread-screen";

/** No `chat/_layout.tsx`: a navigator here would swallow the thread's header options and the
 * back chevron. Stream lives at the protected layout. */
export default function ChatThreadRoute() {
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	return <ThreadScreen conversationId={conversationId} />;
}
