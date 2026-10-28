/**
 * Orchestrator: renders the always-visible mini card in the header
 * and, when the streak has increased past the last acknowledged day,
 * measures the mini card and mounts the reveal overlay via Portal.
 *
 * While a streak saver can undo a break (#437) the mini shows the prior count
 * dimmed with a "Tap to rekindle" chip — the only prompt for a revive. With no
 * offer (no saver, or the window closed) the card just reads the reset.
 */

import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";

import { useIsFocused } from "expo-router/react-navigation";
import { Portal, PressableFeedback, useThemeColor } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	type MeasuredDimensions,
	measure,
	runOnUI,
	useAnimatedRef,
	useReducedMotion,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { posthog } from "@/config/posthog";
import { playSoftPress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";
import {
	type CardColors,
	getCardMetrics,
	MINI_SIZE,
	REVEAL_START_DELAY_MS,
} from "./constants";
import { RekindleSheet } from "./rekindle-sheet";
import { RevealOverlay } from "./reveal-overlay";
import { StreakFlipCard } from "./streak-flip-card";
import { streakStep } from "./streak-step";

const MINI_METRICS = getCardMetrics(MINI_SIZE);
const miniCardStyle = { width: MINI_SIZE };

type Props = {
	/** Undefined until the streak has loaded: nothing is acknowledged or revealed on a guess. */
	currentStreak: number | undefined;
	/** The count a streak saver would restore, while a revive is on offer. */
	reviveStreak?: number;
};

export const StreakCalendar = ({ currentStreak, reviveStreak }: Props) => {
	const { userId } = useAuth();
	const ownStreak = useAppStore((s) =>
		userId ? s.acknowledgedStreaks[userId] : undefined
	);
	const legacyStreak = useAppStore((s) => s.lastAcknowledgedStreak);
	// The acknowledged day is per account, so switching back doesn't replay a
	// reveal. An account without its own entry falls back to the value from
	// before that (so updating doesn't replay one either), which the first
	// write zeroes.
	const lastAcknowledgedStreak = userId ? (ownStreak ?? legacyStreak) : 0;
	const setLastAcknowledgedStreak = useAppStore(
		(s) => s.setLastAcknowledgedStreak
	);
	const reducedMotion = useReducedMotion();
	// The reflect screen stays mounted under pushed screens, and the
	// reveal renders via Portal above everything — so without this gate
	// a streak update would play the reveal on top of whatever screen
	// the user is on. Wait until this screen is focused again.
	const isFocused = useIsFocused();
	// Waits for any home sheet and the first-run tour so they never stack (#460).
	// Not homeSheetBlocking: that stays up through a follow-up's whole pending wait.
	const homeSheetOpen = useAppStore((s) => s.homeSheetOpen);
	const tourActive = useAppStore((s) => s.reflectTourActive);

	const headerColor = useThemeColor("accent") as string;
	const headerTextColor = useThemeColor("accent-foreground") as string;
	const bodyColor = useThemeColor("surface") as string;
	const numberColor = useThemeColor("foreground") as string;

	const colors: CardColors = {
		body: bodyColor,
		header: headerColor,
		headerText: headerTextColor,
		number: numberColor,
	};

	const miniRef = useAnimatedRef<Animated.View>();
	const [miniLayout, setMiniLayout] = useState<MeasuredDimensions | null>(null);

	const revive = useMutation(api.streaks.revive.revive);
	const [sheetOpen, setSheetOpen] = useState(false);
	// The query doesn't re-run when the window closes at midnight, so a revive
	// the server turns down hides the offer it was made from — silently.
	const [expiredOffer, setExpiredOffer] = useState<number>();
	// Re-arm once the query drops the offer, so a later break's revive at the
	// same count still shows.
	if (reviveStreak === undefined && expiredOffer !== undefined) {
		setExpiredOffer(undefined);
	}
	const offer = reviveStreak === expiredOffer ? undefined : reviveStreak;

	const handleRekindle = async () => {
		setSheetOpen(false);
		try {
			const day = await revive();
			posthog.capture("streak_rekindled", { day });
		} catch (error) {
			// Anything else (offline, a server hiccup) leaves the chip up to retry.
			if (
				(error as { data?: { code?: string } }).data?.code ===
				"no_revive_available"
			) {
				setExpiredOffer(offer);
			}
		}
	};

	const step = streakStep(currentStreak, lastAcknowledgedStreak);
	// The rekindled count plays the reveal once the offer is gone.
	const revealPending = offer === undefined && step === "reveal";
	const revealing = miniLayout !== null;

	useEffect(() => {
		// No user id, no owner to acknowledge for.
		if (currentStreak === undefined || !userId) {
			return;
		}
		if (step === "reset") {
			setLastAcknowledgedStreak(currentStreak, userId);
			return;
		}
		if (
			!revealPending ||
			revealing ||
			!isFocused ||
			homeSheetOpen ||
			tourActive
		) {
			return;
		}

		// Reduced motion: skip the reveal entirely, just update the number
		if (reducedMotion) {
			setLastAcknowledgedStreak(currentStreak, userId);
			return;
		}

		const timer = setTimeout(() => {
			runOnUI(() => {
				"worklet";
				const layout = measure(miniRef);
				// A null measure means the reveal cannot be staged, and nothing
				// retries. Acknowledge the streak anyway — the mini deliberately shows
				// a day behind while a reveal is pending, so without this it sits one
				// short forever. A missed animation beats a wrong number.
				// Acknowledge as it goes up either way: once seen it's delivered, so a
				// kill mid-reveal never replays it.
				scheduleOnRN(setLastAcknowledgedStreak, currentStreak, userId);
				if (layout !== null) {
					scheduleOnRN(setMiniLayout, layout);
				}
			})();
		}, REVEAL_START_DELAY_MS);
		return () => clearTimeout(timer);
	}, [
		currentStreak,
		userId,
		step,
		revealPending,
		revealing,
		reducedMotion,
		isFocused,
		homeSheetOpen,
		tourActive,
		miniRef,
		setLastAcknowledgedStreak,
	]);

	const handleDismissed = () => {
		setMiniLayout(null);
		posthog.capture("streak_reveal_acknowledged", {
			day: currentStreak ?? null,
		});
	};

	// While a reveal is pending/running the mini shows the old number; before
	// the streak loads, the last one seen.
	const miniDay =
		currentStreak === undefined
			? lastAcknowledgedStreak
			: revealPending
				? Math.max(currentStreak - 1, 0)
				: currentStreak;

	if (offer !== undefined) {
		return (
			<>
				<PressableFeedback
					accessibilityLabel={`${offer}-day streak went quiet. Tap to rekindle`}
					accessibilityRole="button"
					className="flex-row items-center gap-2"
					onPress={() => {
						playSoftPress();
						setSheetOpen(true);
					}}
				>
					<View className="opacity-40" style={miniCardStyle}>
						<StreakFlipCard
							colors={colors}
							day={offer}
							metrics={MINI_METRICS}
						/>
					</View>
					<View className="rounded-full bg-accent/15 px-3 py-1">
						<AppText className="font-semibold text-accent text-xs">
							Tap to rekindle
						</AppText>
					</View>
				</PressableFeedback>
				<RekindleSheet
					isOpen={sheetOpen}
					onClose={() => setSheetOpen(false)}
					onRekindle={handleRekindle}
					streak={offer}
				/>
			</>
		);
	}

	return (
		<>
			<Animated.View
				className={revealing ? "opacity-0" : "opacity-100"}
				ref={miniRef}
				style={miniCardStyle}
			>
				<StreakFlipCard colors={colors} day={miniDay} metrics={MINI_METRICS} />
			</Animated.View>

			{revealing && currentStreak !== undefined && (
				<Portal name="streak-reveal">
					<RevealOverlay
						colors={colors}
						day={currentStreak}
						miniLayout={miniLayout}
						onDismissed={handleDismissed}
					/>
				</Portal>
			)}
		</>
	);
};
