import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

import { AppText } from "@/src/components/shared/app-text";
import {
	useMiniPlayerAttention,
	useMiniPlayerShown,
} from "@/src/features/browse/now-playing/now-playing-store";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";

/**
 * A one-shot lift when a new track's player closes, so the eye finds the
 * capsule (Oyelo `PlayerView.swift` attention keyframes). Only a bump after
 * mount plays, so a remount never replays it. Reduced motion: a brief dim.
 */
export function useAttentionPulse() {
	const attention = useMiniPlayerAttention();
	const reduced = useEffectiveReducedMotion();
	const [atMount] = useState(attention);
	const t = useSharedValue(0);
	useEffect(() => {
		if (attention === atMount) {
			return;
		}
		t.set(
			withSequence(
				withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
				withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) })
			)
		);
	}, [attention, atMount, t]);
	return useAnimatedStyle(() =>
		reduced
			? { opacity: 1 - 0.12 * t.get() }
			: {
					transform: [
						{ translateY: -3 * t.get() },
						{ scale: 1 + 0.018 * t.get() },
					],
					transformOrigin: "bottom",
				}
	);
}

const GAP = 36;
const POINTS_PER_SECOND = 24;
const REST_MS = 1800;

function useAppActive() {
	const [active, setActive] = useState(AppState.currentState === "active");
	useEffect(() => {
		const sub = AppState.addEventListener("change", (s) =>
			setActive(s === "active")
		);
		return () => sub.remove();
	}, []);
	return active;
}

/**
 * A title that, when it overflows, rests then reads leftward in a loop — only
 * while the capsule is shown, the app is active and motion is allowed
 * (Oyelo `MarqueeTitle`). Otherwise it truncates like any one-line title.
 * ponytail: hard clip at the edges, no fade mask; add MaskedView if it reads harsh.
 */
export function MarqueeTitle({
	title,
	className,
}: {
	title: string;
	className?: string;
}) {
	const reduced = useEffectiveReducedMotion();
	const active = useAppActive();
	const shown = useMiniPlayerShown();
	const [viewport, setViewport] = useState(0);
	const [textWidth, setTextWidth] = useState(0);
	const moving =
		shown && active && !reduced && viewport > 0 && textWidth > viewport + 1;
	const x = useSharedValue(0);

	useEffect(() => {
		cancelAnimation(x);
		x.set(0);
		if (!moving) {
			return;
		}
		const travel = textWidth + GAP;
		x.set(
			withRepeat(
				withSequence(
					withDelay(
						REST_MS,
						withTiming(-travel, {
							duration: (travel / POINTS_PER_SECOND) * 1000,
							easing: Easing.linear,
						})
					),
					withTiming(0, { duration: 0 })
				),
				-1
			)
		);
		return () => cancelAnimation(x);
	}, [moving, textWidth, title, x]);

	const style = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }],
	}));

	return (
		<View
			className="overflow-hidden"
			onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
		>
			{/* Unconstrained copy: its width is the title's natural one-line width. */}
			<View
				accessibilityElementsHidden
				className="absolute top-0 left-0 w-[10000px] flex-row opacity-0"
				importantForAccessibility="no-hide-descendants"
				pointerEvents="none"
			>
				<AppText
					className={className}
					numberOfLines={1}
					onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
				>
					{title}
				</AppText>
			</View>
			{moving ? (
				<Animated.View className="flex-row" style={[{ gap: GAP }, style]}>
					<AppText
						className={className}
						numberOfLines={1}
						style={{ width: textWidth }}
					>
						{title}
					</AppText>
					<AppText
						className={className}
						numberOfLines={1}
						style={{ width: textWidth }}
					>
						{title}
					</AppText>
				</Animated.View>
			) : (
				<AppText className={className} numberOfLines={1}>
					{title}
				</AppText>
			)}
		</View>
	);
}
