import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PressScale } from "@/components/shared/press-scale";
import { RollingNumber } from "@/components/shared/rolling-number";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { playSessionComplete } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { easeOutFn, keyframes } from "../today-motion";
import { Flame } from "./flame";

/** Let the return into Today land before the day is counted on screen. */
const SETTLE_MS = 450;
/** flare-notifications: heat flares fast, the digits follow 150 ms in. */
const ROLL_AFTER_MS = 150;
const IGNITE_MS = 900;
const GLOW_MS = 1300;
const GLOW: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.18, 1],
	[1, 0],
];
const DIGITS = 15;

type Props = {
	/** The flame's flicker clock, shared by the header's chip and the toolbar's so they hand over in step. */
	clock: SharedValue<number>;
	/** The flame flickers: Today live and this chip in view. */
	running: boolean;
	/** The toolbar's copy sits on glass: a white hairline, and it stays silent. */
	elevated?: boolean;
	reduced: boolean;
};

/**
 * The day streak: a lit flame and digits that roll. On the first thing that
 * counts each day it ignites: the flame flares to 1.5, the chip glows amber,
 * 12 rolls to 13, one Bloom. No takeover. Nothing shows until the streak is known.
 */
export function StreakChip({ clock, running, elevated, reduced }: Props) {
	const { state, actions } = useToday();
	const emberInk = useTokenColor("ember-ink");
	// The glow as the flame ignites: ember at .6, 24 pt.
	const igniteGlow = `0 0 24px 6px ${useTokenColor("today-ignite-glow")}`;
	const focused = useIsFocused();
	const ignite = useSharedValue(1);
	// A hidden chip's flame reads a clock that never moves, so its worklet doesn't run each frame.
	const still = useSharedValue(0);
	const glow = useSharedValue(1);
	const count = state.streak?.count ?? 0;
	const igniteKey = state.streak?.igniteKey ?? 0;
	const seen = useRef(igniteKey);
	// The digits roll on Today, not behind another screen: hold the old number until Today is back.
	const [shown, setShown] = useState(count);

	useEffect(() => {
		if (!focused) {
			return;
		}
		if (igniteKey === seen.current) {
			setShown(count);
			return;
		}
		seen.current = igniteKey;
		const timers = [
			setTimeout(() => {
				if (!elevated) {
					playSessionComplete();
				}
				if (reduced) {
					return;
				}
				const linear = { easing: Easing.linear, ...PLAY_AS_CHOSEN };
				ignite.set(0);
				ignite.set(withTiming(1, { duration: IGNITE_MS, ...linear }));
				glow.set(0);
				glow.set(withTiming(1, { duration: GLOW_MS, ...linear }));
			}, SETTLE_MS),
			setTimeout(() => setShown(count), SETTLE_MS + ROLL_AFTER_MS),
		];
		return () => {
			for (const id of timers) {
				clearTimeout(id);
			}
		};
	}, [igniteKey, elevated, focused, glow, ignite, reduced, count]);

	const glowStyle = useAnimatedStyle(() => ({
		opacity: keyframes(glow.get(), GLOW, easeOutFn),
	}));

	if (!state.streak) {
		return null;
	}

	return (
		<PressScale
			accessibilityHint={COPY.streakHint}
			accessibilityLabel={COPY.streakLabel(shown)}
			accessibilityRole="button"
			haptic={Presets.System.selection}
			onPress={actions.openStreak}
		>
			<Animated.View
				className="absolute inset-0 rounded-full"
				pointerEvents="none"
				style={[{ boxShadow: igniteGlow }, glowStyle]}
			/>
			{/* 38 tall, a pill; 9 / 12 sides, 5 between the flame and the digits. */}
			<View
				className={cn(
					"h-9.5 flex-row items-center gap-[5px] rounded-full bg-ember-wash pr-3 pl-[9px]",
					elevated && "border-[0.5px] border-white/90"
				)}
			>
				<Flame
					clock={running ? clock : still}
					ignite={ignite}
					reduced={reduced}
					running={running}
				/>
				<RollingNumber color={emberInk} size={DIGITS} value={shown} />
			</View>
		</PressScale>
	);
}
