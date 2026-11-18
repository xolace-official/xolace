import { useLocalSearchParams } from "expo-router";
import { ThreadData } from "@/features/connect/thread/thread-data";
import { ThreadScreen } from "@/features/connect/thread/thread-screen";
import { useTray } from "@/features/feedback-tray/engine/tray-provider";
import type { Trays } from "@/features/feedback-tray/screens/registry";
import { useFeedbackContext } from "@/features/feedback-tray/use-feedback-context";

/** No `chat/_layout.tsx`: a navigator here would swallow the thread's header options and the back
 * chevron. Stream lives at the protected layout. The concern tray is its own feature, so Report
 * and Flag reach it from here. */
export default function ChatThreadRoute() {
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	const { show } = useTray<Trays>();
	const feedbackContext = useFeedbackContext();
	return (
		<ThreadData
			conversationId={conversationId}
			feedbackContext={feedbackContext}
			reportTo={(subject) => show("report", { kind: "concern", subject })}
		>
			<ThreadScreen />
		</ThreadData>
	);
}
