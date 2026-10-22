import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";

const MILESTONE_COUNTS = new Set([5, 15, 30]);

type LandedChoice = "felt_right" | "too_much" | "not_enough";

type Props = {
	sessionCount: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const HIDDEN_FADE = { opacity: 0 };
const SHOW_TRANSITION = {
	duration: 400,
	easing: EASE,
	type: "timing",
} as const;
const HIDE_TRANSITION = {
	duration: 200,
	easing: EASE,
	type: "timing",
} as const;

/**
 * Shown after milestone sessions (5, 15, 30) if the user has received
 * at least one delivered notification. Asks how the last notification landed.
 */
export const ReachFeedbackCard = ({ sessionCount }: Props) => {
	const [visible, setVisible] = useState(true);
	const [mounted, setMounted] = useState(true);
	const [error, setError] = useState(false);

	const recordLanded = useMutation(api.notifications.recordLandedPublic);
	const lastDelivered = useQuery(api.notifications.lastDelivered);

	if (!MILESTONE_COUNTS.has(sessionCount)) {
		return null;
	}

	if (!lastDelivered) {
		return null;
	}

	// Don't show if this notification already has feedback
	if (lastDelivered.landed) {
		return null;
	}

	if (!mounted) {
		return null;
	}

	const handleChoice = async (choice: LandedChoice) => {
		setError(false);
		try {
			await recordLanded({
				landed: choice,
				notificationId: lastDelivered._id as Id<"notification_log">,
			});
			setVisible(false);
		} catch (err) {
			console.error("Failed to record notification feedback", err);
			setError(true);
		}
	};

	return (
		<EaseView
			animate={visible ? VISIBLE_FADE : HIDDEN_FADE}
			initialAnimate={INITIAL_FADE}
			onTransitionEnd={({ finished }) => {
				if (finished && !visible) {
					setMounted(false);
				}
			}}
			transition={visible ? SHOW_TRANSITION : HIDE_TRANSITION}
		>
			<View className="mx-5 mt-6 rounded-2xl border border-overlay/20 bg-surface p-4">
				<AppText className="mb-2 text-foreground/60 text-sm">
					When I reached out, what landed?
				</AppText>

				<View className="mb-4 rounded-xl bg-background/60 px-3 py-2.5">
					<AppText className="text-foreground/80 text-sm italic">
						&quot;{lastDelivered.content}&quot;
					</AppText>
				</View>

				<View className="flex-row gap-2">
					{(
						[
							{ key: "felt_right", label: "Felt right" },
							{ key: "too_much", label: "Too much" },
							{ key: "not_enough", label: "Not enough" },
						] as { key: LandedChoice; label: string }[]
					).map(({ key, label }) => (
						<Pressable
							className="flex-1 items-center rounded-xl bg-accent/10 py-2 active:opacity-70"
							key={key}
							onPress={() => handleChoice(key)}
						>
							<AppText className="font-medium text-accent text-xs">
								{label}
							</AppText>
						</Pressable>
					))}
				</View>

				{error && (
					<AppText className="mt-3 text-danger text-xs">
						Couldn&apos;t save that. Tap again to retry.
					</AppText>
				)}
			</View>
		</EaseView>
	);
};
