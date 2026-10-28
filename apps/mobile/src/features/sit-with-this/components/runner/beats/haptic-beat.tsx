import { useEffect, useRef } from "react";
import Animated, {
	Easing,
	FadeIn,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import {
	playCompassionateHold,
	playGentlePresence,
	playSoftenPulse,
} from "@/lib/haptics";

// The dot runs withRepeat(1400ms, reverse), so a full cycle is 2800ms; the
// haptic repeats on the same period to stay in phase with it.
const PULSE_CYCLE_MS = 2800;

const INTENSITY_HAPTIC = {
	heavy: playCompassionateHold,
	light: playGentlePresence,
	medium: playSoftenPulse,
} as const;

type Props = {
	content: string;
	fallbackContent?: string;
	durationSeconds: number;
	/** Authored per-step in Convex. Defaults to `medium` (the previous fixed feel). */
	hapticIntensity?: "light" | "medium" | "heavy";
	reducedMotion: boolean;
	onComplete: () => void;
};

export function HapticBeat({
	content,
	fallbackContent,
	durationSeconds,
	hapticIntensity = "medium",
	reducedMotion,
	onComplete,
}: Props) {
	"use no memo";
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pulse = useSharedValue(reducedMotion ? 1 : 0.5);

	useEffect(() => {
		const endsAt = Date.now() + durationSeconds * 1000;

		// Gate haptic on reducedMotion per plan §4.2: dissociated states can be startled.
		if (!reducedMotion) {
			const playPulse = INTENSITY_HAPTIC[hapticIntensity];
			// Repeat on the dot's cycle, and skip a tick with less than half a cycle
			// left: a buzz right before the end reads as the next beat starting.
			playPulse();
			pulseIntervalRef.current = setInterval(() => {
				if (endsAt - Date.now() < PULSE_CYCLE_MS / 2) {
					return;
				}
				playPulse();
			}, PULSE_CYCLE_MS);

			pulse.set(
				withRepeat(
					withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
					-1,
					true
				)
			);
		}

		// Stop the pulse when the beat ends, not on unmount: a transition animation
		// would otherwise carry it into the next beat.
		timerRef.current = setTimeout(() => {
			if (pulseIntervalRef.current) {
				clearInterval(pulseIntervalRef.current);
				pulseIntervalRef.current = null;
			}
			onComplete();
		}, durationSeconds * 1000);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			if (pulseIntervalRef.current) {
				clearInterval(pulseIntervalRef.current);
			}
		};
		// Mount-once: haptic props are fixed for a beat's lifetime
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const dotStyle = useAnimatedStyle(() => ({
		opacity: 0.3 + pulse.get() * 0.5,
		transform: [{ scale: 0.85 + pulse.get() * 0.3 }],
	}));

	// Reduced-motion users get no haptic or pulse, so they need a text anchor.
	const displayContent =
		content || (reducedMotion ? (fallbackContent ?? "") : "");

	return (
		<Animated.View
			accessibilityLiveRegion="polite"
			className="items-center gap-8 px-8"
			entering={FadeIn.duration(500)}
		>
			<Animated.View
				className="h-16 w-16 rounded-full bg-foreground/25"
				style={dotStyle}
			/>
			{displayContent ? (
				<AppText className="text-center font-medium text-foreground text-xl leading-relaxed">
					{displayContent}
				</AppText>
			) : null}
		</Animated.View>
	);
}
