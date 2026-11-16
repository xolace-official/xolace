import { Image, type ImageStyle } from "expo-image";
import { useIsFocused } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import { useAppActive } from "@/components/shared/use-app-active";
import type { AnimateProps } from "@/design/ease";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { useBreathPeriod } from "@/design/motion";
import { BREATH } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** Flux's poses, full-resolution art from assets/images/flux. */
const FLUX = {
	bundle: require("@/assets/images/flux/flux-bundle.png"),
	campfire: require("@/assets/images/flux/flux-campfire.png"),
	compound: require("@/assets/images/flux/flux-compound.png"),
	curiosity: require("@/assets/images/flux/flux-curiosity.png"),
	jump: require("@/assets/images/flux/jump-love-bgremove.png"),
	map: require("@/assets/images/flux/flux-map.png"),
	pair: require("@/assets/images/flux/flux-pair-listening.png"),
	// The prototype's flux-point-down.png: the same file under production's name.
	pointDown: require("@/assets/images/flux/flux-point-down-removebg-preview.png"),
	postcard: require("@/assets/images/flux/plus-postcard-bg.png"),
	sad: require("@/assets/images/flux/flux-sad.png"),
	sitting: require("@/assets/images/flux/mirror-v2-bg.png"),
	thinking: require("@/assets/images/flux/loading-1.png"),
	vent: require("@/assets/images/flux/vent-bg.png"),
	wave: require("@/assets/images/flux/name-accepted-wave.png"),
	whisper: require("@/assets/images/flux/flux-whisper.png"),
	writer: require("@/assets/images/flux/writer-flux.png"),
} as const;
export type FluxPose = keyof typeof FLUX;

const REST: AnimateProps = { scale: 1, translateY: 0 };
const LIFT: AnimateProps = { scale: BREATH.scale, translateY: -BREATH.rise };
const FILL = { height: "100%", width: "100%" } as const;

type Props = {
	pose: FluxPose;
	width: number;
	height?: number;
	/** Breath: rise 3 pt and scale 1.02 on a sine loop; paused off-screen. */
	breathe?: boolean;
	/** Override the loop (e.g. 6.7 s after two misses). */
	periodMs?: number;
	style?: StyleProp<ViewStyle>;
	imageStyle?: StyleProp<ImageStyle>;
	label?: string;
};

/**
 * The mascot. Breathes as a native loop, holds still with reduced motion, and
 * costs nothing when hidden: the loop eases back to rest and stops when its
 * screen loses focus or the app goes to the background.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function Flux({
	pose,
	width,
	height,
	breathe = false,
	periodMs,
	style,
	imageStyle,
	label,
}: Props) {
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const active = useAppActive();
	const dayPeriod = useBreathPeriod();
	const period = periodMs ?? dayPeriod;
	const running = breathe && !reduced && focused && active;
	// Ease restarts a loop only on remount: a new run (a start, or the night slowdown) moves the key.
	const run = useLoopRun(running, period);

	return (
		<EaseView
			accessibilityLabel={label}
			accessibilityRole={label ? "image" : undefined}
			accessible={Boolean(label)}
			key={run}
			pointerEvents="none"
			{...loopOrSettle({
				from: REST,
				periodMs: period,
				reduced,
				running,
				to: LIFT,
			})}
			style={[{ height: height ?? width, width }, style]}
		>
			<Image
				contentFit="contain"
				source={FLUX[pose]}
				style={[FILL, imageStyle]}
				transition={0}
			/>
		</EaseView>
	);
}
