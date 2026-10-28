import { Image } from "expo-image";
import { useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedProps,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import type { Twig } from "../twig-presentation";
import { STOP_NODE, TrailStop } from "./trail-stop";

const FIRE = require("@/assets/images/flux/flux-campfire.png");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const ROW = 150;
const EDGE = 20;
const FIRE_SIZE = 140;

/**
 * The Lantern trail: one stop per twig, alternating sides,
 * down a winding trail of marching dashes to Flux's fire. The trail runs
 * solid ember up to the last tended stop. Tapping a stop opens it in the
 * floating card — the trail itself never starts anything.
 */
export function KindlingTrail({
	twigs,
	openId,
	onOpen,
}: {
	twigs: Twig[];
	openId: Twig["_id"] | undefined;
	onOpen: (twig: Twig) => void;
}) {
	const { width: w } = useWindowDimensions();
	const foreground = useThemeColor("foreground") as string;
	const ember = useCSSVariable("--color-ember") as string;
	const reduced = useEffectiveReducedMotion();
	const offset = useSharedValue(0);

	useEffect(() => {
		if (reduced) {
			return;
		}
		offset.set(
			withRepeat(withTiming(-48, { duration: 1600, easing: Easing.linear }), -1)
		);
		// Stops the march when reduce motion turns on mid-visit, and on unmount.
		return () => cancelAnimation(offset);
	}, [reduced, offset]);
	const dashProps = useAnimatedProps(() => ({
		strokeDashoffset: offset.get(),
	}));

	const cx = (i: number) =>
		i % 2 === 0 ? w - EDGE - STOP_NODE / 2 : EDGE + STOP_NODE / 2;
	const cy = (i: number) => 40 + STOP_NODE / 2 + i * ROW;
	const fireY = cy(twigs.length) + 20;
	const pts = [...twigs.map((_, i) => [cx(i), cy(i)]), [w / 2, fireY]];
	// Each leg is a vertical-tangent cubic, so the trail leaves and enters every stop straight.
	const segment = (to: number) => {
		let d = `M ${pts[0][0]} ${pts[0][1]}`;
		for (let i = 1; i <= to; i++) {
			const [x1, y1] = pts[i - 1];
			const [x2, y2] = pts[i];
			const my = (y1 + y2) / 2;
			d += ` C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
		}
		return d;
	};
	const full = segment(pts.length - 1);
	const lastDone = twigs.reduce((n, t, i) => (t.state === "done" ? i : n), -1);
	const height = fireY + FIRE_SIZE + 20;

	return (
		<View style={{ height }}>
			<Svg height={height} style={{ position: "absolute" }} width={w}>
				<Path
					d={full}
					fill="none"
					stroke={foreground}
					strokeLinecap="round"
					strokeOpacity={0.06}
					strokeWidth={18}
				/>
				{lastDone > 0 && (
					<Path
						d={segment(lastDone)}
						fill="none"
						stroke={ember}
						strokeLinecap="round"
						strokeOpacity={0.5}
						strokeWidth={6}
					/>
				)}
				<AnimatedPath
					animatedProps={dashProps}
					d={full}
					fill="none"
					stroke={foreground}
					strokeDasharray="4 12"
					strokeLinecap="round"
					strokeOpacity={0.3}
					strokeWidth={4}
				/>
			</Svg>

			{twigs.map((twig, i) => (
				<TrailStop
					index={i}
					inset={EDGE - 10}
					key={twig._id}
					onPress={() => onOpen(twig)}
					right={i % 2 === 0}
					selected={twig._id === openId}
					top={cy(i) - STOP_NODE / 2 - 10}
					twig={twig}
					width={w - EDGE * 2 + 10}
				/>
			))}

			<Image
				accessibilityIgnoresInvertColors
				contentFit="contain"
				source={FIRE}
				style={{
					height: FIRE_SIZE,
					left: w / 2 - FIRE_SIZE / 2,
					position: "absolute",
					top: fireY - 30,
					width: FIRE_SIZE,
				}}
			/>
		</View>
	);
}
