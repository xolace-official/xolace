import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";

type Chip = { key: string; label: string };

const CHIPS_BY_INTENSITY: Record<string, readonly Chip[]> = {
	high: [
		{ key: "mirror_missed", label: "The mirror missed" },
		{ key: "something_happened", label: "Something happened" },
		{ key: "building_for_a_while", label: "Building for a while" },
		{ key: "needed_to_say_it", label: "I needed to say it" },
	],
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
};

const QUESTIONS_BY_INTENSITY: Record<string, string> = {
	high: "What's bearing down hardest right now?",
	low: "What's underneath the heaviness?",
	mid: "What's keeping it this heavy?",
};

function intensityBucket(intensity: number): string {
	if (intensity <= 2) {
		return "low";
	}
	if (intensity === 3) {
		return "mid";
	}
	return "high";
}

export function useHeavierFeedback(
	sessionId: Id<"sessions"> | undefined,
	onClose: () => void
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

	const canSubmit =
		intensity > 0 && selectedChip !== null && Boolean(sessionId);

	const handleSubmit = async () => {
		if (!(canSubmit && sessionId)) {
			return;
		}
		try {
			await submit({
				selectedOption: selectedChip,
				sessionId,
				text: text.trim() || undefined,
				type: "mood_heavier",
			});
			posthog.capture("feedback_submitted", {
				has_text: !!text.trim(),
				intensity,
				type: "mood_heavier",
			});
			toast.show({
				description: "We hear you.",
				label: "Thank you for sharing",
				variant: "default",
			});
			onClose();
		} catch {
			toast.show({
				description: "Your response wasn't saved.",
				label: "Something went wrong",
				variant: "default",
			});
		}
	};

	return {
		canSubmit,
		chips,
		handleSubmit,
		intensity,
		questionText,
		selectedChip,
		setIntensity: (v: number) => {
			setIntensity(v);
			setSelectedChip(null);
		},
		setSelectedChip,
		setText,
		text,
	};
}
