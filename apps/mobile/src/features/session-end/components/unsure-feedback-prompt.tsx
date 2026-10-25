import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { EaseView } from "react-native-ease/uniwind";
import {
	UNSURE_CHIPS,
	useUnsureFeedback,
} from "@/src/features/session-end/hooks/use-unsure-feedback";
import { FeedbackSheet } from "./feedback-sheet";

type Props = {
	sessionId?: Id<"sessions">;
	isOpen: boolean;
	onClose: () => void;
};

export function UnsureFeedbackPrompt({ sessionId, isOpen, onClose }: Props) {
	const {
		selectedChip,
		setSelectedChip,
		text,
		setText,
		canSubmit,
		handleSubmit,
	} = useUnsureFeedback(sessionId, onClose);

	return (
		<FeedbackSheet.Frame
			isOpen={isOpen}
			keyboardBehavior="interactive"
			onClose={onClose}
		>
			<FeedbackSheet.Header subtitle="No wrong answers here.">
				What&apos;s making it hard to tell?
			</FeedbackSheet.Header>

			<FeedbackSheet.Chips
				chips={UNSURE_CHIPS}
				onSelect={setSelectedChip}
				selected={selectedChip}
			/>

			{selectedChip && (
				<EaseView
					animate={{ opacity: 1 }}
					initialAnimate={{ opacity: 0 }}
					transition={{ duration: 200, type: "timing" }}
				>
					<FeedbackSheet.Input onChangeText={setText} value={text} />
					<FeedbackSheet.Submit disabled={!canSubmit} onPress={handleSubmit} />
				</EaseView>
			)}
		</FeedbackSheet.Frame>
	);
}
