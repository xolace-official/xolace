// Flux, live (README § Live Flux, #710): the Xolace face posed by the step's mood, with the
// mood's own motion on top. Talking moves the mouth, happy hops once as it arrives, listening
// sends sound rings out, thinking shows three thought dots. Under reduced motion the pose
// alone says it: no hop or mouth, still rings and dots.
import { useEffect, useEffectEvent, useState } from "react";
import { View } from "react-native";
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
import { MOOD_POSES, type Mood } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const RING_MS = 1800;
const RING_FROM = 0.75;
const RING_GROW = 0.6;
const RING_OPACITY = 0.55;
const RING_STILL_OPACITY = 0.3;
// The rings sit on the body, a little inside the face's box (the prototype's 0.86).
const RING_INSET = 0.07;
const DOT_MS = 600;
const DOT_STAGGER_MS = 300;
const DOT_DIM = 0.15;
// Smallest first, rising to the top right like a thought bubble, as fractions of the face.
const DOTS = [
	{ r: 0.025, x: 0.8, y: 0.2 },
	{ r: 0.03, x: 0.87, y: 0.13 },
	{ r: 0.035, x: 0.95, y: 0.05 },
] as const;
/** How long each character of a line takes to say; `ask` types its question at this pace. */
export const SAY_MS_PER_CHAR = 38;

type Props = { mood: Mood; size: number };

export function Flux({ mood, size }: Props) {
	const reduced = useEffectiveReducedMotion();
	const face = useFace(MOOD_POSES[mood]);

	useEffect(() => face.to(MOOD_POSES[mood]), [face.to, mood]);
	useEffect(() => face.talk(mood === "talking"), [face.talk, mood]);
	// Once per arrival at happy: the motion setting loading later mustn't hop it again.
	const hopIfHappy = useEffectEvent(() => {
		if (mood === "happy") {
			face.hop();
		}
	});
	useEffect(() => hopIfHappy(), [mood]);

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{ height: size, width: size }}
		>
			{/* One still ring under reduced motion; two would stack into a darker one. */}
			{mood === "listening" &&
				(reduced ? [0] : [0, RING_MS / 2]).map((delay) => (
					<SoundRing
						delay={delay}
						inset={RING_INSET * size}
						key={delay}
						reduced={reduced}
					/>
				))}
			<XolaceFace face={face} size={size} />
			{mood === "thinking" &&
				DOTS.map((dot, i) => (
					<ThoughtDot
						delay={i * DOT_STAGGER_MS}
						key={dot.x}
						reduced={reduced}
						style={{
							height: dot.r * 2 * size,
							left: (dot.x - dot.r) * size,
							top: (dot.y - dot.r) * size,
							width: dot.r * 2 * size,
						}}
					/>
				))}
		</View>
	);
}

/** True while a line of this length is being said, from when it first shows. Never under
 * reduced motion, where `ask` shows its line at once too. */
export function useSaying(line: string) {
	const reduced = useEffectiveReducedMotion();
	const [saying, setSaying] = useState(true);
	useEffect(() => {
		if (reduced) {
			setSaying(false);
			return;
		}
		setSaying(true);
		const timer = setTimeout(
			() => setSaying(false),
			line.length * SAY_MS_PER_CHAR
		);
		return () => clearTimeout(timer);
	}, [line, reduced]);
	return saying;
}

type RingProps = { delay: number; inset: number; reduced: boolean };

function SoundRing({ delay, inset, reduced }: RingProps) {
	const progress = useSharedValue(0);
	useEffect(() => {
		if (reduced) {
			cancelAnimation(progress);
			return;
		}
		progress.set(
			withDelay(
				delay,
				withRepeat(
					withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.quad) }),
					-1
				)
			)
		);
		return () => cancelAnimation(progress);
	}, [delay, progress, reduced]);
	const style = useAnimatedStyle(() => {
		const p = progress.get();
		return reduced
			? { opacity: RING_STILL_OPACITY, transform: [{ scale: 1 }] }
			: {
					opacity: RING_OPACITY * (1 - p),
					transform: [{ scale: RING_FROM + RING_GROW * p }],
				};
	});
	return (
		<Animated.View
			className="absolute rounded-full border-2 border-ember"
			style={[{ bottom: inset, left: inset, right: inset, top: inset }, style]}
		/>
	);
}

type DotProps = {
	delay: number;
	reduced: boolean;
	style: { height: number; left: number; top: number; width: number };
};

function ThoughtDot({ delay, reduced, style }: DotProps) {
	const opacity = useSharedValue(DOT_DIM);
	useEffect(() => {
		if (reduced) {
			cancelAnimation(opacity);
			return;
		}
		opacity.set(
			withDelay(
				delay,
				withRepeat(
					withSequence(
						withTiming(1, { duration: DOT_MS }),
						withTiming(DOT_DIM, { duration: DOT_MS })
					),
					-1
				)
			)
		);
		return () => cancelAnimation(opacity);
	}, [delay, opacity, reduced]);
	const fade = useAnimatedStyle(() => ({
		opacity: reduced ? 1 : opacity.get(),
	}));
	return (
		<Animated.View
			className="absolute rounded-full bg-foreground"
			style={[style, fade]}
		/>
	);
}
