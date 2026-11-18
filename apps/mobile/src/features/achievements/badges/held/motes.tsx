import { View } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { Pose } from "@/features/achievements/coin/pose";

/** Motes rise 170 pt and fade over 1.9 s, staggered, from landing (badges §3). */
const MOTE_MS = 1900;
const COUNT = 12;
const GOLDEN_ANGLE = 2.399_96;
const RISE = 170;
const DRIFT = 0.55;
/** Each mote peaks this far into its life, then fades. */
const PEAK = 0.18;
const RING = { base: 58, step: 22 } as const;
const SPREAD_Y = 46;
const LIFT_Y = 12;
const STAGGER_MS = 70;
const SIZE = { base: 3, step: 1 } as const;
const GROW_FROM = 0.6;
const bez = Easing.bezierFn(0.2, 0.7, 0.3, 1);

/** The board's MOTES: 12 on a golden-angle spiral around the badge. */
const MOTES = Array.from({ length: COUNT }, (_, i) => {
	const a = i * GOLDEN_ANGLE;
	return {
		d: (i % 6) * STAGGER_MS,
		s: SIZE.base + (i % 3) * SIZE.step,
		x: Math.cos(a) * (RING.base + (i % 3) * RING.step),
		y: Math.sin(a) * SPREAD_Y - LIFT_Y,
	};
});

type Mote = (typeof MOTES)[number];

/**
 * Twelve small views moved by transforms: a Skia picture didn't draw inside the
 * moving page on device. `glow` is a shared value, so a new badge recolours them
 * without a render.
 */
export function Motes({
	pose,
	cx,
	cy,
	glow,
}: {
	pose: SharedValue<Pose>;
	cx: number;
	cy: number;
	glow: SharedValue<string>;
}) {
	return (
		<View
			className="absolute"
			pointerEvents="none"
			style={{ left: cx, top: cy }}
		>
			{MOTES.map((m) => (
				<MoteView glow={glow} key={`${m.x}:${m.y}`} m={m} pose={pose} />
			))}
		</View>
	);
}

function MoteView({
	m,
	pose,
	glow,
}: {
	m: Mote;
	pose: SharedValue<Pose>;
	glow: SharedValue<string>;
}) {
	const style = useAnimatedStyle(() => {
		const mt = pose.get().mt;
		const t = mt < 0 ? 0 : (mt - m.d) / MOTE_MS;
		if (t <= 0 || t >= 1) {
			return { opacity: 0 };
		}
		const e = bez(t);
		const a = t < PEAK ? bez(t / PEAK) : 1 - bez((t - PEAK) / (1 - PEAK));
		const c = glow.get();
		return {
			backgroundColor: c,
			boxShadow: `0px 0px 8px 1px ${c}`,
			opacity: a,
			transform: [
				{ translateX: m.x * DRIFT * e },
				{ translateY: -RISE * e },
				{ scale: GROW_FROM + (1 - GROW_FROM) * e },
			],
		};
	});
	return (
		<Animated.View
			className="absolute rounded-full"
			style={[
				{
					height: m.s,
					left: m.x - m.s / 2,
					opacity: 0,
					top: m.y - m.s / 2,
					width: m.s,
				},
				style,
			]}
		/>
	);
}
