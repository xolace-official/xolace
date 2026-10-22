import { useState } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useToast } from "heroui-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Chip = { key: string; label: string };

const CHIPS_BY_INTENSITY: Record<string, readonly Chip[]> = {
  low: [
    { key: "mirror_missed", label: "The mirror missed" },
    { key: "just_tired", label: "Just tired today" },
    { key: "feeling_lost", label: "Feeling lost" },
    { key: "something_else", label: "Something else" },
  ],
  mid: [
    { key: "mirror_missed", label: "The mirror missed" },
    { key: "life_is_heavy", label: "Life is just heavy" },
    { key: "feeling_disconnected", label: "Feeling disconnected" },
    { key: "something_else", label: "Something else" },
  ],
  high: [
    { key: "mirror_missed", label: "The mirror missed" },
    { key: "something_happened", label: "Something happened" },
    { key: "building_for_a_while", label: "Building for a while" },
    { key: "needed_to_say_it", label: "I needed to say it" },
  ],
};

const QUESTIONS_BY_INTENSITY: Record<string, string> = {
  low: "What's underneath the heaviness?",
  mid: "What's keeping it this heavy?",
  high: "What's bearing down hardest right now?",
};

function intensityBucket(intensity: number): string {
  if (intensity <= 2) return "low";
  if (intensity === 3) return "mid";
  return "high";
}

export function useHeavierFeedback(
  sessionId: Id<"sessions"> | undefined,
  onClose: () => void,
) {
  const [intensity, setIntensity] = useState(0);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [text, setText] = useState("");

  const submit = useMutation(api.feedback.submit);
  const posthog = usePostHog();
  const { toast } = useToast();

  const bucket = intensityBucket(intensity);
  const chips = intensity > 0 ? CHIPS_BY_INTENSITY[bucket] : [];
  const questionText = intensity > 0 ? QUESTIONS_BY_INTENSITY[bucket] : "";

  const canSubmit = intensity > 0 && selectedChip !== null && Boolean(sessionId);

  const handleSubmit = async () => {
    if (!canSubmit || !sessionId) return;
    try {
      await submit({
        type: "mood_heavier",
        sessionId,
        selectedOption: selectedChip,
        text: text.trim() || undefined,
      });
      posthog.capture("feedback_submitted", {
        type: "mood_heavier",
        intensity,
        has_text: !!text.trim(),
      });
      toast.show({ label: "Thank you for sharing", description: "We hear you.", variant: "default" });
      onClose();
    } catch {
      toast.show({ label: "Something went wrong", description: "Your response wasn't saved.", variant: "default" });
    }
  };

  return {
    intensity,
    setIntensity: (v: number) => {
      setIntensity(v);
      setSelectedChip(null);
    },
    selectedChip,
    setSelectedChip,
    text,
    setText,
    chips,
    questionText,
    canSubmit,
    handleSubmit,
  };
}
