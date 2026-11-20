import { useEffect } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import type { EyeStyle } from "@/components/xolace-face/face-geo";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE, FOLLOW, LAYOUT, REDUCED_MS, T1, T2 } from "../session-look";
import { clamp01 } from "../timeline";

const F = LAYOUT.face;
const half = (ms: number) => ({
	duration: ms / 2,
	easing: Easing.inOut(Easing.ease),
	...PLAY_AS_CHOSEN,
});

type Props = {
	W: number;
	top: number;
	face: FaceHandle;
	eyes: EyeStyle;
	late: boolean;
	c1: SharedValue<number>;
	c2: SharedValue<number>;
	pos: SharedValue<number>;
	breath: SharedValue<number>;
	bobbing: boolean;
	dy: number;
	fit: number;
	reduced: boolean;
};

export function FaceStage(p: Props) {
	const { W, top, face, eyes, late, c1, c2, pos, breath, dy, fit, reduced } = p;
	const float = useSharedValue(0);
	const bob = useSharedValue(0);

	useAnimatedReaction(
		() => (c2.get() >= 0 ? 0 : (pos.get() - 0.5) * 2),
		(u, was) => {
			if (u === was) {
				return;
			}
			const to =
				-FOLLOW.floatUp * Math.max(0, u) + FOLLOW.floatDown * Math.max(0, -u);
			float.set(
				reduced
					? to
					: withSpring(to, { ...FOLLOW.floatSpring, ...PLAY_AS_CHOSEN })
			);
		}
	);

	const period = late ? FOLLOW.bob.lateMs : FOLLOW.bob.ms;
	const bobbing = p.bobbing && !reduced;
	useEffect(() => {
		if (!bobbing) {
			bob.set(withTiming(0, { duration: REDUCED_MS, ...PLAY_AS_CHOSEN }));
			return;
		}
		bob.set(
			withRepeat(
				withSequence(withTiming(1, half(period)), withTiming(0, half(period))),
				-1,
				false
			)
		);
		return () => cancelAnimation(bob);
	}, [bobbing, period, bob]);

	const stage = useAnimatedStyle(() => {
		const m2 = c2.get();
		if (m2 >= 0) {
			if (reduced) {
				const f = m2 / REDUCED_MS;
				const there = f >= 0.5;
				return {
					opacity: there ? clamp01((f - 0.5) * 2) : 1 - clamp01(f * 2),
					transform: [
						{ translateY: there ? F.headerY : dy },
						{ scale: there ? F.headerScale : fit },
					],
				};
			}
			const k = EASE.faceUp(clamp01((m2 - T2.face.at) / T2.face.ms));
			return {
				opacity: 1,
				transform: [
					{ translateY: dy + (F.headerY - dy) * k },
					{ scale: fit + (F.headerScale - fit) * k },
				],
			};
		}
		const k = reduced
			? 1
			: EASE.faceDown(clamp01((c1.get() - T1.faceDown.at) / T1.faceDown.ms));
		return {
			opacity: 1,
			transform: [
				{ translateY: F.headerY + (dy - F.headerY) * k },
				{ scale: F.headerScale + (fit - F.headerScale) * k },
			],
		};
	});
	const move = useAnimatedStyle(() => {
		const u = Math.max(0, (pos.get() - 0.5) * 2);
		const amp = FOLLOW.bob.base + FOLLOW.bob.lift * (c2.get() >= 0 ? 0 : u);
		return { transform: [{ translateY: float.get() - amp * bob.get() }] };
	});
	const breathe = useAnimatedStyle(() => {
		const m2 = c2.get();
		const w = m2 < 0 || reduced ? 0 : clamp01((m2 - T2.face.at) / T2.face.ms);
		const b = breath.get() * w;
		return {
			transform: [
				{ translateY: (-FOLLOW.breath.rise * b) / F.headerScale },
				{ scaleX: 1 + FOLLOW.breath.sx * b },
				{ scaleY: 1 + FOLLOW.breath.sy * b },
			],
		};
	});

	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute z-20"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{ height: F.size, left: (W - F.size) / 2, top, width: F.size },
				stage,
			]}
		>
			<Animated.View style={[{ height: F.size, width: F.size }, move]}>
				<Animated.View
					style={[
						{ height: F.size, transformOrigin: "50% 92%", width: F.size },
						breathe,
					]}
				>
					<XolaceFace
						eyes={eyes}
						face={face}
						palette={late ? "ember" : undefined}
						size={F.size}
					/>
				</Animated.View>
			</Animated.View>
		</Animated.View>
	);
}
