import { useLocalSearchParams } from "expo-router";
import { FeedbackData } from "@/features/feedback/feedback-data";
import { feedbackStartOf } from "@/features/feedback/feedback-model";
import { FeedbackSheet } from "@/features/feedback/feedback-screen";

/** Shake to send feedback, or a concern about a person: a form sheet (`features/feedback/screens.ts`). */
export default function FeedbackRoute() {
	const params = useLocalSearchParams();
	const from = typeof params.from === "string" ? params.from : undefined;
	return (
		<FeedbackData from={from} start={feedbackStartOf(params)}>
			<FeedbackSheet />
		</FeedbackData>
	);
}
