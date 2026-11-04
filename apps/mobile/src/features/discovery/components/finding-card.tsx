import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { PressableFeedback } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import {
	type FindingPicks,
	findingAnswer,
	findingCardDue,
	findingStep,
} from "@/features/discovery/finding-card";
import { useRecordDeferredAnswer } from "@/features/intake/use-record-deferred-answer";
import { useFullContext } from "@/lib/convex/use-full-context";
import { playSoftPress } from "@/lib/haptics";
import { useAccountFlag } from "@/store/use-account-flag";

const FADE_MS = 320;
/** How long the thank-you line holds before the card goes. */
const THANKS_MS = 2400;

/**
 * "How did you find Xolace?" on Discovery from a v2 user's third day (#711): one tap, with
 * the series pair on the same card after short video (Back returns to the source). "Not
 * now" puts it away for good for this account; an answer saves through
 * `intake.deferred.record` and the card thanks them and goes.
 */
export function FindingCard() {
	const missing = useQuery(api.intake.deferred.missing);
	const completedAt = useFullContext()?.intake?.completedAt;
	const [dismissed, markDismissed] = useAccountFlag("findingCardDismissed");
	const recordAnswer = useRecordDeferredAnswer();
	const [showing, setShowing] = useState(false);
	const [thanked, setThanked] = useState(false);
	const [picks, setPicks] = useState<FindingPicks>({});

	// Latched: saving drops acquisitionSource from `missing`, and the thanks must stay.
	if (
		!(showing || thanked) &&
		missing !== undefined &&
		completedAt !== undefined &&
		findingCardDue({ completedAt, dismissed, missing, now: new Date() })
	) {
		setShowing(true);
	}

	useEffect(() => {
		if (!thanked) {
			return;
		}
		const timer = setTimeout(() => setShowing(false), THANKS_MS);
		return () => clearTimeout(timer);
	}, [thanked]);

	if (!showing) {
		return null;
	}
	const step = findingStep(picks);

	const choose = async (value: string) => {
		playSoftPress();
		const next = step.pick(picks, value);
		const answer = findingAnswer(next);
		setPicks(next);
		if (answer) {
			setThanked(true);
			await recordAnswer(answer);
		}
	};

	const notNow = () => {
		markDismissed();
		setShowing(false);
	};
	const back = () => setPicks({});
	const aside = step.dismissible
		? { label: "Not now", onPress: notNow }
		: { label: "Back", onPress: back };

	return (
		<Animated.View
			entering={FadeIn.duration(FADE_MS)}
			exiting={FadeOut.duration(FADE_MS)}
		>
			<View className="gap-3 rounded-3xl border border-border/65 bg-surface px-5 py-5">
				{thanked ? (
					<AppText
						accessibilityLiveRegion="polite"
						className="font-[Poppins-Medium] text-[17px] text-foreground leading-6"
					>
						Thank you. It helps us reach people like you.
					</AppText>
				) : (
					<>
						<View className="flex-row items-start justify-between gap-3">
							<AppText
								accessibilityRole="header"
								className="flex-1 font-[Poppins-Medium] text-[17px] text-foreground leading-6"
							>
								{step.question}
							</AppText>
							<PressableFeedback
								accessibilityLabel={aside.label}
								accessibilityRole="button"
								className="min-h-11 justify-center"
								hitSlop={8}
								onPress={aside.onPress}
							>
								<AppText className="text-foreground/55 text-sm">
									{aside.label}
								</AppText>
							</PressableFeedback>
						</View>
						<View className="flex-row flex-wrap gap-2">
							{step.choices.map(({ label, value }) => (
								<PressableFeedback
									accessibilityLabel={label}
									accessibilityRole="button"
									className="rounded-full border border-border/70 px-3.5 py-2"
									key={value}
									onPress={() => choose(value)}
								>
									<AppText className="text-foreground/75 text-sm">
										{label}
									</AppText>
								</PressableFeedback>
							))}
						</View>
					</>
				)}
			</View>
		</Animated.View>
	);
}
