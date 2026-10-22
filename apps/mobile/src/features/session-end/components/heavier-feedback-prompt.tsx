import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import type { Id } from "@/convex/_generated/dataModel";
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
    <FeedbackSheet.Frame keyboardBehavior="interactive" isOpen={isOpen} onClose={onClose}>
      <FeedbackSheet.Header subtitle="You don't have to answer, but this is just for us to understand.">
        How did that land?
      </FeedbackSheet.Header>

      <FlameIntensitySelector value={intensity} onChange={setIntensity} />

      {intensity > 0 && (
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, easing: [0.455, 0.03, 0.515, 0.955] }}
          className="gap-5"
        >
          <View>
            <AnimatedText className="text-base font-light text-foreground/70">
              {questionText}
            </AnimatedText>
          </View>

          <FeedbackSheet.Chips
            chips={chips}
            selected={selectedChip}
            onSelect={setSelectedChip}
          />

          {selectedChip && (
            <EaseView
              initialAnimate={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 200 }}
            >
              <FeedbackSheet.Input value={text} onChangeText={setText} />
              <FeedbackSheet.Submit onPress={handleSubmit} disabled={!canSubmit} />
            </EaseView>
          )}
        </EaseView>
      )}
    </FeedbackSheet.Frame>
  );
}
