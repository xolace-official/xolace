import { useState } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useToast } from "heroui-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const UNSURE_CHIPS = [
  { key: "felt_ok_while_here", label: "Felt okay while I was here" },
  { key: "still_processing", label: "Still processing it" },
  { key: "too_many_things", label: "Too many things at once" },
  { key: "something_else", label: "Something else" },
] as const;

export function useUnsureFeedback(
  sessionId: Id<"sessions"> | undefined,
  onClose: () => void,
) {
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [text, setText] = useState("");

  const submit = useMutation(api.feedback.submit);
  const posthog = usePostHog();
  const { toast } = useToast();

  const canSubmit = selectedChip !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await submit({
        type: "mood_unsure",
        sessionId,
        selectedOption: selectedChip,
        text: text.trim() || undefined,
      });
      posthog.capture("feedback_submitted", {
        type: "mood_unsure",
        has_text: !!text.trim(),
      });
      toast.show({ label: "Thank you", description: "That helps us understand.", variant: "default" });
      onClose();
    } catch {
      toast.show({ label: "Something went wrong", description: "Your response wasn't saved.", variant: "default" });
    }
  };

  return {
    selectedChip,
    setSelectedChip,
    text,
    setText,
    canSubmit,
    handleSubmit,
  };
}
