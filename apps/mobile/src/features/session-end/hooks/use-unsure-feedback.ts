import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";

export const UNSURE_CHIPS = [
	{ key: "felt_ok_while_here", label: "Felt okay while I was here" },
	{ key: "still_processing", label: "Still processing it" },
	{ key: "too_many_things", label: "Too many things at once" },
	{ key: "something_else", label: "Something else" },
] as const;

export function useUnsureFeedback(
	sessionId: Id<"sessions"> | undefined,
	onClose: () => void
) {
	const [selectedChip, setSelectedChip] = useState<string | null>(null);
	const [text, setText] = useState("");

	const submit = useMutation(api.feedback.submit);
	const posthog = usePostHog();
	const { toast } = useToast();

	const canSubmit = selectedChip !== null;

	const handleSubmit = async () => {
		if (!canSubmit) {
			return;
		}
		try {
			await submit({
				selectedOption: selectedChip,
				sessionId,
				text: text.trim() || undefined,
				type: "mood_unsure",
			});
			posthog.capture("feedback_submitted", {
				has_text: !!text.trim(),
				type: "mood_unsure",
			});
			toast.show({
				description: "That helps us understand.",
				label: "Thank you",
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
		handleSubmit,
		selectedChip,
		setSelectedChip,
		setText,
		text,
	};
}
