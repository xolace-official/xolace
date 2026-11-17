import { type ReactNode, useEffect, useRef } from "react";
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

/** native-cook's press pose: tip toward the finger by up to 14°, sink 5%. */
const TIP_DEG = 14;
const TIP_PERSPECTIVE = 400;
const PRESS_SCALE = 0.95;
const PRESS_MS = 110;
/** The board's release: .32 s cubic-bezier(.34, 1.56, .64, 1), a small overshoot. */
const RELEASE = { damping: 19, stiffness: 380, ...PLAY_AS_CHOSEN };
/** Seated again: a small pop from .94. */
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

/** The press pose: where the finger lands (from the medallion's centre at cx, cy, radius r) tips it. */
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

/** The medallion: tips under the finger, pops when it seats again, and is the slot it flies from. */
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
	const ref = useRef<ViewInstance>(null);
	const scale = useSharedValue(1);
	const seat = useHeld((s) =>
		s.seat.id === id && s.seat.slot === slot ? s.seat.n : 0
	);

	useEffect(() => {
		const v = ref.current;
		if (!v) {
			return;
		}
		SLOTS.set(slot, v);
		return () => {
			if (SLOTS.get(slot) === v) {
				SLOTS.delete(slot);
			}
		};
	}, [slot]);

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
			ref={ref}
			style={[{ height: size, width: size }, style]}
		>
			{children}
		</Animated.View>
	);
}
