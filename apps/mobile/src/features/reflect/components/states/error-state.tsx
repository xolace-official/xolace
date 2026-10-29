import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { LinkButton, ScrollShadow } from "heroui-native";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { isRateLimitMessage } from "@/features/reflect/session-service";
import { playErrorNotice } from "@/lib/haptics";

type Props = {
	errorMessage: string;
	/** The session's stored input. Empty when no session holds it (submit rolled back). */
	rawInput: string;
	onRetry: () => void;
	onReset: () => void;
};

// Copy pending safety review: never name the category or imply fault.
const REJECTED_COPY =
	"This is something I can't reflect back here. If it's weighing on you, talking to someone can help.";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const EASE_UPGRADE = {
	delay: 200,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_RETRY = {
	delay: 300,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_RESET = {
	delay: 400,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};

export const ErrorState = ({
	errorMessage,
	rawInput,
	onRetry,
	onReset,
}: Props) => {
	const { isPlus } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	// The hourly cap is the free/Plus gate, so free users get the door instead of a dead end.
	const showUpgrade = !isPlus && isRateLimitMessage(errorMessage);
	// The safeguard's rejection code (convex/ai/safeguard.ts). Retry would only
	// fail again, so offer support instead.
	const rejected = errorMessage === "content_policy_violation";
	const router = useRouter();

	useEffect(() => {
		playErrorNotice();
	}, []);

	return (
		// Scrolls so the recovery actions stay reachable on short screens / large text.
		<ScrollView
			className="flex-1"
			contentContainerClassName="grow justify-center px-6 py-8"
			showsVerticalScrollIndicator={false}
		>
			<AppText className="text-foreground text-xl leading-8">
				Take a breath.
			</AppText>

			<AppText className="mt-4 text-base text-foreground/40 leading-6">
				{rejected ? REJECTED_COPY : errorMessage}
			</AppText>

			{showUpgrade ? (
				<AppText className="mt-3 text-base text-foreground/40 leading-6">
					Xolace+ raises the hourly limit.
				</AppText>
			) : null}

			{/* A failure must never look like the writing vanished: this is the stored
			    session input that retry reprocesses. */}
			{rawInput ? (
				<View className="mt-8">
					<AppText className="mb-2 text-foreground/40 text-sm">
						Your words are still here.
					</AppText>
					<ScrollShadow
						className="max-h-[160]"
						LinearGradientComponent={LinearGradient}
						size={28}
					>
						<ScrollView
							nestedScrollEnabled
							showsVerticalScrollIndicator={false}
						>
							<AppText className="text-base text-foreground/30 italic leading-7">
								{rawInput}
							</AppText>
						</ScrollView>
					</ScrollShadow>
				</View>
			) : null}

			<View className="mt-14 gap-6">
				{showUpgrade ? (
					<EaseView
						animate={EASE_ANIMATE}
						initialAnimate={EASE_INITIAL}
						transition={EASE_UPGRADE}
					>
						<LinkButton
							accessibilityLabel="See Xolace Plus"
							className="self-start"
							onPress={() => openPaywall("rate_limit")}
							size="md"
						>
							<LinkButton.Label className="font-semibold text-accent">
								See Xolace+
							</LinkButton.Label>
						</LinkButton>
					</EaseView>
				) : null}

				<EaseView
					animate={EASE_ANIMATE}
					initialAnimate={EASE_INITIAL}
					transition={EASE_RETRY}
				>
					{rejected ? (
						<LinkButton
							accessibilityLabel="Talk to someone"
							className="self-start"
							onPress={() => router.push("/(protected)/crisis-resources")}
							size="md"
						>
							<LinkButton.Label className="font-semibold text-accent">
								Talk to someone
							</LinkButton.Label>
						</LinkButton>
					) : (
						<LinkButton
							accessibilityLabel="Try again"
							className="self-start"
							onPress={onRetry}
							size="md"
						>
							<LinkButton.Label
								className={
									showUpgrade
										? "text-foreground/55"
										: "font-semibold text-accent"
								}
							>
								Try again
							</LinkButton.Label>
						</LinkButton>
					)}
				</EaseView>

				<EaseView
					animate={EASE_ANIMATE}
					initialAnimate={EASE_INITIAL}
					transition={EASE_RESET}
				>
					<LinkButton
						accessibilityLabel="Start fresh"
						className="self-start"
						onPress={onReset}
						size="md"
					>
						<LinkButton.Label className="text-foreground/55">
							Start fresh
						</LinkButton.Label>
					</LinkButton>
				</EaseView>
			</View>
		</ScrollView>
	);
};
