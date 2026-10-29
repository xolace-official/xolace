/** Intake offer (T4, #235): no price; "I'm ready" pushes plans. Never wire into
 * plus-offer-policy.ts: declining must not spend the dismissal budget. */

import { useFocusEffect, useRouter } from "expo-router";
import { Button, useThemeColor } from "heroui-native";
import { useFeatureFlag, usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { trackStepViewed } from "@/features/intake/analytics";
import { intentLine } from "@/features/intake/paywall/intent-line";
import {
	InsightsOfferCard,
	KindlingBrowseOfferCard,
	LimitsOfferCard,
	XolacersOfferCard,
} from "@/features/intake/paywall/offer-cards";
import { VoiceOfferCard } from "@/features/intake/paywall/voice-offer-card";
import {
	IntakeBlank,
	IntakeScreen,
} from "@/features/intake/questionnaire/intake-screen";
import { useIntakeComplete } from "@/features/intake/use-intake-complete";
import { GradientText } from "@/features/purchases/screens/gradient-text";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";

/** The A/B: the Q2 line on (treatment) vs off (control). */
export const INTAKE_PERSONALIZED_LINE_FLAG = "intake-paywall-personalized-line";

const GAP = 14;
const EDGE = 20;

const styles = StyleSheet.create({
	deck: {
		alignItems: "stretch",
		gap: GAP,
		paddingHorizontal: EDGE,
		paddingVertical: 4,
	},
});

export default function IntakeOffer() {
	const router = useRouter();
	const posthog = usePostHog();
	const completeIntake = useIntakeComplete();
	const answers = useAppStore((s) => s.intakeAnswers);
	const { width, height } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const accentColor = useThemeColor("accent") as string;
	const { isPlus, isResolved } = usePlusEntitlement();
	const skipping = useRef(false);
	const [skipFailed, setSkipFailed] = useState(false);

	// An unresolved flag falls back to control.
	const arm = useFeatureFlag(INTAKE_PERSONALIZED_LINE_FLAG);
	const personalized = arm === true || arm === "test";

	// The arm is frozen when the impression fires and the line renders from the
	// frozen value, never the live flag. `null` = the impression has not fired yet.
	const [shownArm, setShownArm] = useState<boolean | null>(null);
	// Latched during render so the deck and the impression agree; an effect
	// would let one frame of the deck render against a still-null arm.
	if (shownArm === null && isResolved && !isPlus) {
		setShownArm(personalized);
	}
	const line = intentLine(answers, shownArm === true);

	// The peek on the right is what says "there is more"; the deck has no dots.
	const cardWidth = Math.min(width - EDGE * 2 - 44, 320);
	// Tuned to the fullest card (Insights); clamped so a short device keeps the CTA on screen.
	const deckHeight = Math.min(430, height * 0.54);

	// Session 0 by construction: intake runs once, before any session exists.
	const track = (event: string, treatment: boolean) =>
		posthog.capture(event, {
			arm: treatment ? "treatment" : "control",
			personalized: treatment,
			session_count: 0,
			surface: "intake",
		});

	useEffect(() => {
		// Keyed on the latch, so "shown" and "counted as shown" are the same moment;
		// an on-mount capture would count subscribers the focus effect pushes back out.
		if (shownArm === null) {
			return;
		}
		// Not `paywall_opened`: that means "saw pricing" elsewhere, and this screen
		// has no price. This is the A/B impression.
		track("intake_offer_opened", shownArm);
		// `step_key: "paywall"` (T7 §2.3) means this deck, not the pricing screen behind it.
		trackStepViewed(posthog, "paywall");
		// `track` is re-created every render; `shownArm` only ever flips once.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shownArm]);

	const handleDismiss = () => {
		// Paired with `intake_offer_opened`, not `paywall_dismissed`: that one is a
		// dismissal of pricing, which fires from `(intake)/plans`.
		track("intake_offer_dismissed", shownArm === true);
		void completeIntake("dismissed_paywall");
	};

	// A subscriber must never be pitched (T4, #235): `isPlus` can resolve late, so
	// finish intake the moment it does, behind a blank frame. Focus-scoped because
	// a purchase on `(intake)/plans` also flips `isPlus` while this is mounted.
	const skipForSubscriber = useCallback(() => {
		if (skipping.current) {
			return;
		}
		skipping.current = true;
		setSkipFailed(false);
		void completeIntake("skipped_paywall").then((written) => {
			if (written) {
				return;
			}
			// The write was swallowed and this screen renders nothing while `isPlus`;
			// unlatch and offer a retry, or the blank frame has no way out.
			skipping.current = false;
			setSkipFailed(true);
		});
	}, [completeIntake]);

	useFocusEffect(
		useCallback(() => {
			if (!isPlus) {
				return;
			}
			skipForSubscriber();
		}, [isPlus, skipForSubscriber])
	);

	if (isPlus) {
		if (!skipFailed) {
			return <IntakeBlank />;
		}
		return (
			<IntakeScreen>
				<View className="flex-1 justify-center gap-4 px-5">
					<AppText className="font-[Poppins-SemiBold] text-[22px] text-foreground leading-[29px]">
						That didn&apos;t go through.
					</AppText>
					<AppText className="font-[Poppins-Regular] text-[15px] text-foreground/50 leading-[21px]">
						Your answers are still here. Check your connection and try again.
					</AppText>
					<Button
						onPress={() => {
							playSoftPress();
							skipForSubscriber();
						}}
					>
						<Button.Label>Try again</Button.Label>
					</Button>
				</View>
			</IntakeScreen>
		);
	}

	// Blank until the impression has fired: the deck must not show before
	// entitlement resolves, and the arm must not log against an unseen screen.
	if (shownArm === null) {
		return <IntakeBlank />;
	}

	return (
		<IntakeScreen>
			<View className="flex-1 gap-4 pt-2">
				{/* The headline is the only thing above the deck; at this size it seats the
				    deck low enough to read as one row. */}
				<View className="gap-2 px-5 pt-1">
					{line ? (
						<Animated.View
							entering={reduced ? undefined : FadeIn.duration(320)}
						>
							<AppText className="font-[Poppins-Regular] text-[16px] text-foreground/45 leading-[23px]">
								{line}
							</AppText>
						</Animated.View>
					) : null}
					<View className="flex-row flex-wrap items-baseline">
						<GradientText
							className="font-[Poppins-SemiBold] text-[30px] leading-[38px]"
							gradientProps={{
								colors: [`${accentColor}80`, accentColor, `${accentColor}80`],
							}}
							text="Xolace+"
						/>
						<AppText className="font-[Poppins-SemiBold] text-[22px] text-foreground leading-[38px]">
							is where it goes further.
						</AppText>
					</View>
					<AppText className="font-[Poppins-Regular] text-[15px] text-foreground/50 leading-[21px]">
						Free for your first 7 days.
					</AppText>
				</View>

				{/* Explicitly sized: stretched, the lighter cards open a hole under their
            title, and a horizontal ScrollView sized to its content collapses. */}
				<View className="flex-1 justify-center">
					<ScrollView
						contentContainerStyle={styles.deck}
						decelerationRate="fast"
						horizontal
						showsHorizontalScrollIndicator={false}
						snapToAlignment="start"
						snapToInterval={cardWidth + GAP}
						style={{ height: deckHeight }}
					>
						<VoiceOfferCard width={cardWidth} />
						<KindlingBrowseOfferCard width={cardWidth} />
						<XolacersOfferCard width={cardWidth} />
						<InsightsOfferCard width={cardWidth} />
						<LimitsOfferCard width={cardWidth} />
					</ScrollView>
				</View>

				<View className="gap-3 px-5 pt-1">
					<Button
						onPress={() => {
							playSoftPress();
							router.push("/(intake)/plans");
						}}
					>
						<Button.Label>I&apos;m ready</Button.Label>
					</Button>
					{/* A recessive text link, not a button: dismissing is not the thing being
					    offered. */}
					<AppText
						accessibilityRole="button"
						className="py-1 text-center font-[Poppins-Regular] text-[14px] text-foreground/40"
						onPress={handleDismiss}
					>
						Not now
					</AppText>
				</View>
			</View>
		</IntakeScreen>
	);
}
