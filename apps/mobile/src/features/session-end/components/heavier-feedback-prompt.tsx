import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AnimatedText } from "@/src/components/shared/animated-text";
import { FeedbackSheet } from "@/src/features/session-end/components/feedback-sheet";
import { FlameIntensitySelector } from "@/src/features/session-end/components/flame-intensity-selector";
import { useHeavierFeedback } from "@/src/features/session-end/hooks/use-heavier-feedback";

type Props = {
	sessionId?: Id<"sessions">;
	isOpen: boolean;
	onClose: () => void;
};

export function HeavierFeedbackPrompt({ sessionId, isOpen, onClose }: Props) {
	const {
		intensity,
		setIntensity,
		selectedChip,
		setSelectedChip,
		text,
		setText,
		chips,
		questionText,
		canSubmit,
		handleSubmit,
	} = useHeavierFeedback(sessionId, onClose);

	return (
		<FeedbackSheet.Frame
			isOpen={isOpen}
			keyboardBehavior="interactive"
			onClose={onClose}
		>
			<FeedbackSheet.Header subtitle="You don't have to answer, but this is just for us to understand.">
				How did that land?
			</FeedbackSheet.Header>

			<FlameIntensitySelector onChange={setIntensity} value={intensity} />

			{intensity > 0 && (
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					className="gap-5"
					initialAnimate={{ opacity: 0, translateY: 8 }}
					transition={{
						duration: 300,
						easing: [0.455, 0.03, 0.515, 0.955],
						type: "timing",
					}}
				>
					<View>
						<AnimatedText className="font-light text-base text-foreground/70">
							{questionText}
						</AnimatedText>
					</View>

					<FeedbackSheet.Chips
						chips={chips}
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
							<FeedbackSheet.Submit
								disabled={!canSubmit}
								onPress={handleSubmit}
							/>
						</EaseView>
					)}
				</EaseView>
			)}
		</FeedbackSheet.Frame>
	);
}
