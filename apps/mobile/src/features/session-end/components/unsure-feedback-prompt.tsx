import { EaseView } from "react-native-ease/uniwind";
import type { Id } from "@/convex/_generated/dataModel";
import { FeedbackSheet } from "./feedback-sheet";
import { UNSURE_CHIPS, useUnsureFeedback } from "@/src/features/session-end/hooks/use-unsure-feedback";

type Props = {
  sessionId?: Id<"sessions">;
  isOpen: boolean;
  onClose: () => void;
};

export function UnsureFeedbackPrompt({ sessionId, isOpen, onClose }: Props) {
  const { selectedChip, setSelectedChip, text, setText, canSubmit, handleSubmit } =
    useUnsureFeedback(sessionId, onClose);

  return (
    <FeedbackSheet.Frame keyboardBehavior="interactive" isOpen={isOpen} onClose={onClose}>
      <FeedbackSheet.Header subtitle="No wrong answers here.">
        What&apos;s making it hard to tell?
      </FeedbackSheet.Header>

      <FeedbackSheet.Chips
        chips={UNSURE_CHIPS}
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
    </FeedbackSheet.Frame>
  );
}
