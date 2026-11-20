import { useEffect, useState } from "react";
import Animated, {
	Easing,
	type EasingFunction,
	type EasingFunctionFactory,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playAffirmativePress } from "@/lib/haptics";
import { LETTER_MOTION } from "../letter-motion";
import { useLetterInk } from "../letter-paper";

const M = LETTER_MOTION;
const S = M.stamp;
const DROP = Easing.bezier(...M.curves.drop);
const ROLL = Easing.bezier(...M.curves.roll);
const SQUASH = Easing.out(Easing.quad);
export const STAMP_INSET = { bottom: 18, right: 24 };
const FADE_MS = 40;
const TURN = { drop: -9, squash: -7 };
const t = (
	to: number,
	duration: number,
	easing: EasingFunction | EasingFunctionFactory = ROLL
) => withTiming(to, { duration, easing, ...PLAY_AS_CHOSEN });

export function Stamp({ on, reduced }: { on: boolean; reduced: boolean }) {
	const ink = useLetterInk();
	const opacity = useSharedValue(on ? 1 : 0);
	const scale = useSharedValue(1);
	const rotate = useSharedValue<number>(S.rotateTo);
	const [landed] = useState(on);

	useEffect(() => {
		if (!on) {
			opacity.set(t(0, M.reducedMs));
			return;
		}
		if (landed && opacity.get() === 1) {
			return;
		}
		if (reduced) {
			scale.set(1);
			rotate.set(S.rotateTo);
			opacity.set(t(1, M.reducedMs));
			playAffirmativePress();
			return;
		}
		const never = PLAY_AS_CHOSEN.reduceMotion;
		opacity.set(t(1, FADE_MS));
		scale.set(
			withSequence(
				never,
				t(S.from, 0),
				t(1, S.dropMs, DROP),
				t(S.squash, S.squashMs, SQUASH),
				t(1, S.settleMs)
			)
		);
		rotate.set(
			withSequence(
				never,
				t(S.rotateFrom, 0),
				t(TURN.drop, S.dropMs, DROP),
				t(TURN.squash, S.squashMs, SQUASH),
				t(S.rotateTo, S.settleMs)
			)
		);
		const landing = setTimeout(playAffirmativePress, S.dropMs);
		return () => clearTimeout(landing);
	}, [on, reduced, landed, opacity, scale, rotate]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ scale: scale.get() }, { rotate: `${rotate.get()}deg` }],
	}));
	return (
		<Animated.View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					backgroundImage: ink.stamp,
					borderRadius: S.size / 2,
					bottom: STAMP_INSET.bottom,
					boxShadow: ink.stampShadow,
					height: S.size,
					position: "absolute",
					right: STAMP_INSET.right,
					width: S.size,
				},
				style,
			]}
		/>
	);
}
