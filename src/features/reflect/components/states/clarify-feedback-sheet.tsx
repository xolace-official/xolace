import { useState } from "react";
import { useMutation } from "convex/react";
import { Presets } from "react-native-pulsar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FeedbackSheet } from "@/src/features/session-end/components/feedback-sheet";
import type { MissReason } from "@/src/features/reflect/types";

const CHIPS = [
  { key: "wrong_emotion", label: "Wrong emotion" },
  { key: "too_surface_level", label: "Too surface-level" },
  { key: "close_but_not_quite", label: "Close but not quite" },
  { key: "missed_the_main_thing", label: "Missed the main thing" },
] as const satisfies readonly { key: MissReason; label: string }[];

// Long enough to see the pick land, short enough not to feel like a wait.
const ACK_MS = 250;

type Props = {
  sessionId: Id<"sessions"> | null;
  turnIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** The picked chip, so the clarify prompt can follow it. */
  onPick: (reason: MissReason) => void;
};

export function ClarifyFeedbackSheet({ sessionId, turnIndex, isOpen, onClose, onPick }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<MissReason | null>(null);
  const submitFeedback = useMutation(api.feedback.submit);

  // Reset the submitted latch each time the sheet (re)opens — adjusted during
  // render with a prev-prop comparison rather than a useEffect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSubmitted(false);
      setSelected(null);
    }
  }

  // `sessionId` is non-null whenever the sheet is open — the owner gates
  // `isOpen` on it, so a tap can never be silently dropped. The check remains
  // as a type narrowing and a backstop if it goes null mid-open.
  const handleChip = (key: string) => {
    if (submitted) return;
    const reason = key as MissReason;
    if (sessionId) {
      Presets.chirp();
      setSubmitted(true);
      setSelected(reason);
      onPick(reason);
      submitFeedback({
        type: "mirror_miss",
        sessionId,
        turnIndex,
        selectedOption: key,
      }).catch(() => {});
      // A stray fire after the sheet already closed only re-nulls the turn.
      setTimeout(onClose, ACK_MS);
      return;
    }
    onClose();
  };

  // Content-sized, like the other feedback sheets. The old fixed "48%" snap
  // point could leave the chips (and any exit) below the fold.
  return (
    <FeedbackSheet.Frame isOpen={isOpen} onClose={onClose}>
      <FeedbackSheet.Header subtitle="One tap, no pressure — or dismiss." onDismiss={onClose}>
        What didn&apos;t land?
      </FeedbackSheet.Header>
      <FeedbackSheet.Chips chips={CHIPS} selected={selected} onSelect={handleChip} lockOnSelect />
      <FeedbackSheet.Submit onPress={onClose} label="Skip" />
    </FeedbackSheet.Frame>
  );
}
