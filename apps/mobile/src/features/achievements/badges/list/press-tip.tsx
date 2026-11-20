import { type ReactNode, useEffect } from "react";
import type { GestureResponderEvent, ViewInstance } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { SLOTS, useHeld } from "@/features/achievements/badges/held-store";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const TIP_DEG = 14;
const TIP_PERSPECTIVE = 400;
const PRESS_SCALE = 0.95;
const PRESS_MS = 110;
const RELEASE = { damping: 19, stiffness: 380, ...PLAY_AS_CHOSEN };
const SEAT_FROM = 0.94;
const SEAT = { damping: 16, stiffness: 420, ...PLAY_AS_CHOSEN };

export type Tip = {
	fx: SharedValue<number>;
	fy: SharedValue<number>;
	p: SharedValue<number>;
	onPressIn: (e: GestureResponderEvent) => void;
	onPressOut: () => void;
};

const unit = (v: number) => Math.max(-1, Math.min(1, v));

export function usePressTip(cx: number, cy: number, r: number): Tip {
	const reduced = useEffectiveReducedMotion();
	const fx = useSharedValue(0);
	const fy = useSharedValue(0);
	const p = useSharedValue(0);
	return {
		fx,
		fy,
		onPressIn: (e) => {
			if (reduced) {
				return;
			}
			fx.set(unit((e.nativeEvent.locationX - cx) / r));
			fy.set(unit((e.nativeEvent.locationY - cy) / r));
			p.set(
				withTiming(1, {
					duration: PRESS_MS,
					easing: Easing.out(Easing.quad),
					...PLAY_AS_CHOSEN,
				})
			);
		},
		onPressOut: () => p.set(withSpring(0, RELEASE)),
		p,
	};
}

export function Tipped({
	id,
	tip,
	size,
	slot = id,
	children,
}: {
	id: string;
	tip: Tip;
	size: number;
	slot?: string;
	children: ReactNode;
}) {
	const reduced = useEffectiveReducedMotion();
	const scale = useSharedValue(1);
	const seat = useHeld((s) =>
		s.seat.id === id && s.seat.slot === slot ? s.seat.n : 0
	);

	// Registers the tile so a held badge can fly back to it; React 19 calls the cleanup on detach.
	const register = (v: ViewInstance | null) => {
		if (!v) {
			return;
		}
		SLOTS.set(slot, v);
		return () => {
			if (SLOTS.get(slot) === v) {
				SLOTS.delete(slot);
			}
		};
	};

	useEffect(() => {
		if (!seat || reduced) {
			return;
		}
		scale.set(
			withSequence(
				withTiming(SEAT_FROM, { duration: 0, ...PLAY_AS_CHOSEN }),
				withSpring(1, SEAT)
			)
		);
	}, [seat, reduced, scale]);

	const { fx, fy, p } = tip;
	const style = useAnimatedStyle(() => {
		const v = p.get();
		return {
			transform: [
				{ perspective: TIP_PERSPECTIVE },
				{ rotateX: `${-fy.get() * TIP_DEG * v}deg` },
				{ rotateY: `${fx.get() * TIP_DEG * v}deg` },
				{ scale: scale.get() * (1 - (1 - PRESS_SCALE) * v) },
			],
		};
	});
	return (
		<Animated.View
			collapsable={false}
			ref={register}
			style={[{ height: size, width: size }, style]}
		>
			{children}
		</Animated.View>
	);
}
