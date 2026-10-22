import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { LinkButton } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { GaveUpFeedbackCard } from "@/src/features/reflect/components/gave-up-feedback-card";
import { playCompassionateHold } from "@/src/lib/haptics";

type Props = {
	onPathSelection: () => void;
	onReset: () => void;
	sessionId?: Id<"sessions">;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const EASE_T1 = {
	delay: 200,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_T2 = {
	delay: 400,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_T3 = {
	delay: 600,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};

export const GaveUpState = ({ onPathSelection, onReset, sessionId }: Props) => {
	const router = useRouter();

	useEffect(() => {
		playCompassionateHold();
	}, []);

	return (
		<View className="flex-1 justify-center px-6">
			<AppText className="text-foreground text-xl leading-8">
				Sometimes words can&apos;t quite capture what we feel, and that&apos;s
				okay.
			</AppText>

			<AppText className="mt-4 text-base text-foreground/40 leading-6">
				What you shared still matters, even if the mirror didn&apos;t reflect it
				perfectly.
			</AppText>

			{sessionId && <GaveUpFeedbackCard sessionId={sessionId} />}

			<View className="mt-14 gap-6">
				<EaseView
					animate={EASE_ANIMATE}
					initialAnimate={EASE_INITIAL}
					transition={EASE_T1}
				>
					<LinkButton
						accessibilityLabel="See my options"
						className="self-start"
						onPress={onPathSelection}
						size="md"
					>
						<LinkButton.Label className="font-semibold text-accent">
							See my options
						</LinkButton.Label>
					</LinkButton>
				</EaseView>

				<EaseView
					animate={EASE_ANIMATE}
					initialAnimate={EASE_INITIAL}
					transition={EASE_T2}
				>
					<LinkButton
						accessibilityLabel="Start fresh"
						className="self-start"
						onPress={onReset}
						size="md"
					>
						<LinkButton.Label className="text-foreground/50">
							Start fresh
						</LinkButton.Label>
					</LinkButton>
				</EaseView>

				<EaseView
					animate={EASE_ANIMATE}
					initialAnimate={EASE_INITIAL}
					transition={EASE_T3}
				>
					<LinkButton
						accessibilityLabel="Explore different mirror tones"
						className="self-start"
						onPress={() => router.push("/settings")}
						size="sm"
					>
						<LinkButton.Label className="text-foreground/30">
							Explore different mirror tones →
						</LinkButton.Label>
					</LinkButton>
				</EaseView>
			</View>
		</View>
	);
};
