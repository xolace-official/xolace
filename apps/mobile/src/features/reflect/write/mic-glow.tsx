import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTokenColors } from "@/lib/use-token-color";
import { LAYOUT } from "../layout";
import { SPEAK } from "../motion";

const MIC = LAYOUT.bar.mic;
/** Board `.hmic::before`: a spectrum ring 1.5 pt wide, 3 pt outside the mic, at .55. */
const RING_OUT = 3;
const RING_W = 1.5;
const RING_OPACITY = 0.55;
const RING = MIC + RING_OUT * 2;
const SPECTRUM = ["peach", "rose", "lilac", "sky"] as const;
/** Board `.hmic::after`: the glow reaches 18 pt past the mic and grows 1.25× while held. */
const GLOW_OUT = 18;
const GLOW_HELD = 1.25;
const GLOW = MIC + GLOW_OUT * 2;

/** The Flux spectrum ring around the mic. */
export function MicRing() {
	const stops = useTokenColors(SPECTRUM);
	return (
		<Svg
			height={RING}
			pointerEvents="none"
			style={{ left: -RING_OUT, position: "absolute", top: -RING_OUT }}
			width={RING}
		>
			<Defs>
				<LinearGradient id="mic-ring" x1="0" x2="1" y1="0" y2="1">
					{stops.map((c, i) => (
						<Stop
							key={SPECTRUM[i]}
							offset={i / (stops.length - 1)}
							stopColor={c}
						/>
					))}
				</LinearGradient>
			</Defs>
			<Circle
				cx={RING / 2}
				cy={RING / 2}
				fill="none"
				opacity={RING_OPACITY}
				r={RING / 2 - RING_W / 2}
				stroke="url(#mic-ring)"
				strokeWidth={RING_W}
			/>
		</Svg>
	);
}

/**
 * The warm glow under the finger (S2): it powers up with the take, its reach drawing in from
 * 1.7× to 1× as it does, and follows the finger across the mic.
 */
export function MicGlow({
	power,
	x,
}: {
	power: SharedValue<number>;
	x: SharedValue<number>;
}) {
	const [from, to] = useTokenColors([
		"reflect-mic-glow",
		"reflect-mic-glow-end",
	]);
	const style = useAnimatedStyle(() => {
		const p = power.get();
		const reach = SPEAK.restSpread - (SPEAK.restSpread - 1) * p;
		const grow = 1 + (GLOW_HELD - 1) * p;
		return {
			opacity: p,
			transform: [
				{ translateX: x.get() * p },
				{ scaleX: reach * grow },
				{ scaleY: grow },
			],
		};
	});
	return (
		<Animated.View
			className="absolute"
			pointerEvents="none"
			style={[
				{
					borderRadius: GLOW / 2,
					experimental_backgroundImage: `radial-gradient(closest-side, ${from}, ${to})`,
					height: GLOW,
					left: -GLOW_OUT,
					top: -GLOW_OUT,
					width: GLOW,
				},
				style,
			]}
		/>
	);
}
