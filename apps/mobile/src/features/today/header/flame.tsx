import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { useTokenColor } from "@/lib/use-token-color";
import { easeInOutFn, igniteFn, keyframes } from "../today-motion";
import { FLAME_CORE } from "../today-palette";

/** The board's 18 pt vector flame (24 pt viewBox). */
const SIZE = 18;
const OUTER =
	"M12 2c1 4 6 6 6 12a6 6 0 1 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z";
const CORE =
	"M12 11c.6 2 3 3 3 6a3 3 0 1 1-6 0c0-1.6 1-2.6 1.6-3.2.2 1 .6 1.6 1.2 1.6 0-2-.4-3 .2-4.4z";
/** Both shapes stand on y 20 of 24, centred on x 12: their fill-box bottoms. */
const BASE = { x: (12 / 24) * SIZE, y: (20 / 24) * SIZE };
const ORIGIN = `${BASE.x}px ${BASE.y}px`;
const EASE_ORIGIN = { x: 0.5, y: 20 / 24 };

/** flick, 1.9 s: lean and stretch from the base. */
const FLICK_S = 1.9;
const SKEW: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.3, -3],
	[0.62, 2],
	[1, 0],
];
const STRETCH: readonly (readonly [number, number])[] = [
	[0, 1],
	[0.3, 1.05],
	[0.62, 0.97],
	[1, 1],
];
/** core, 0.9 s alternate: the white core flickers faster (streak-steps-widget): opacity .7 → 1, .9 → 1. */
const CORE_MS = 1800;
const CORE_LOW = { opacity: 0.7, scale: 0.9 };
const CORE_HIGH = { opacity: 1, scale: 1 };
/** ignite: 1 → 1.5 (2 pt up) at 18% → 1, over 0.9 s. */
const IGNITE_SCALE: readonly (readonly [number, number])[] = [
	[0, 1],
	[0.18, 1.5],
	[1, 1],
];
const IGNITE_LIFT: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.18, -2],
	[1, 0],
];

type Props = {
	/** Seconds; the outer flicker stops when this stops. Run it only while `running`. */
	clock: SharedValue<number>;
	/** The flame flickers (live and on screen); stopped, the core settles back. */
	running: boolean;
	/** 0 → 1 over the ignite (0.9 s); 1 at rest. */
	ignite: SharedValue<number>;
	reduced: boolean;
};

/**
 * A flame that's actually lit: the outer flame leans and stretches, the core flickers faster.
 * The core is a native loop (react-native-ease). The outer flame leans with skewX, which Ease
 * can't animate, so it stays on the clock (Reanimated).
 */
export function Flame({ clock, running, ignite, reduced }: Props) {
	const ember = useTokenColor("ember");
	const whole = useAnimatedStyle(() => {
		const p = ignite.get();
		return {
			transform: [
				{ translateY: keyframes(p, IGNITE_LIFT, igniteFn) },
				{ scale: keyframes(p, IGNITE_SCALE, igniteFn) },
			],
		};
	});
	const outer = useAnimatedStyle(() => {
		const f = (clock.get() % FLICK_S) / FLICK_S;
		return {
			transform: [
				{ skewX: `${keyframes(f, SKEW, easeInOutFn)}deg` },
				{ scaleY: keyframes(f, STRETCH, easeInOutFn) },
			],
		};
	});
	const coreRun = useLoopRun(running && !reduced);
	const core = loopOrSettle({
		from: CORE_LOW,
		periodMs: CORE_MS,
		reduced,
		running,
		to: CORE_HIGH,
	});

	return (
		<Animated.View style={[{ height: SIZE, width: SIZE }, whole]}>
			<Animated.View
				className="absolute"
				style={[{ height: SIZE, transformOrigin: ORIGIN, width: SIZE }, outer]}
			>
				<Svg height={SIZE} viewBox="0 0 24 24" width={SIZE}>
					<Path d={OUTER} fill={ember} />
				</Svg>
			</Animated.View>
			<EaseView
				key={coreRun}
				{...core}
				className="absolute"
				style={{ height: SIZE, width: SIZE }}
				transformOrigin={EASE_ORIGIN}
			>
				<Svg height={SIZE} viewBox="0 0 24 24" width={SIZE}>
					<Path d={CORE} fill={FLAME_CORE} />
				</Svg>
			</EaseView>
		</Animated.View>
	);
}
