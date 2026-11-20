import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { ThreadData } from "@/features/connect/thread/thread-data";
import { ThreadScreen } from "@/features/connect/thread/thread-screen";
import { concernParams } from "@/features/feedback/feedback-model";
import { useFeedbackContext } from "@/features/feedback/use-feedback-context";

/** No `chat/_layout.tsx`: a navigator here would swallow the thread's header options and the back
 * chevron. Stream lives at the protected layout. The feedback sheet is its own feature, so Report
 * and Flag reach it from here. */
export default function ChatThreadRoute() {
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	const router = useRouter();
	const pathname = usePathname();
	const feedbackContext = useFeedbackContext();
	return (
		<ThreadData
			conversationId={conversationId}
			feedbackContext={feedbackContext}
			reportTo={(subject) =>
				router.push({
					params: concernParams(subject, pathname),
					pathname: "/feedback",
				})
			}
		>
			<ThreadScreen />
		</ThreadData>
	);
}
