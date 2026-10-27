import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { PressableFeedback, Surface } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";

const OPTIONS = [
	{ key: "mirror_kept_missing", label: "The mirror kept missing" },
	{ key: "figured_it_out", label: "I found it myself" },
	{ key: "needed_to_vent", label: "I just needed to express it" },
] as const;

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_ANIMATE_VISIBLE = { opacity: 1 };
const EASE_ANIMATE_HIDDEN = { opacity: 0 };
const EASE_TRANSITION = {
	duration: 200,
	easing: EASING,
	type: "timing" as const,
};

type Props = {
	sessionId: Id<"sessions">;
};

export const GaveUpFeedbackCard = ({ sessionId }: Props) => {
	const [visible, setVisible] = useState(true);
	const [mounted, setMounted] = useState(true);
	const submitFeedback = useMutation(api.feedback.submit);
	const posthog = usePostHog();

	if (!mounted) {
		return null;
	}

	const handleOption = (key: string) => {
		submitFeedback({
			selectedOption: key,
			sessionId,
			type: "gave_up",
		})
			.then(() => {
				setVisible(false);
				posthog.capture("feedback_submitted", {
					has_option: true,
					has_text: false,
					type: "gave_up",
				});
			})
			.catch((e) => console.error("gave_up feedback failed", e));
	};

	return (
		<EaseView
			animate={visible ? EASE_ANIMATE_VISIBLE : EASE_ANIMATE_HIDDEN}
			onTransitionEnd={({ finished }) => {
				if (finished && !visible) {
					setMounted(false);
				}
			}}
			transition={EASE_TRANSITION}
		>
			<Surface className="mx-5 mt-4 rounded-2xl p-4">
				<AppText className="mb-3 text-foreground/60 text-sm">
					What happened?
				</AppText>

				<View className="gap-2">
					{OPTIONS.map(({ key, label }) => (
						<PressableFeedback
							accessibilityLabel={label}
							className="w-full items-center rounded-xl bg-accent/10 py-3 active:opacity-70"
							key={key}
							onPress={() => handleOption(key)}
						>
							<AppText className="font-medium text-accent text-sm">
								{label}
							</AppText>
						</PressableFeedback>
					))}
				</View>
			</Surface>
		</EaseView>
	);
};
