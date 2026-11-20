import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
	coinAt,
	type Eng,
	type Geo,
	PH,
	SPARKLE_MS,
	SPARKLES,
} from "@/features/achievements/arrival/arrival-motion";
import { easeOut, seg, TAU } from "@/features/achievements/motion-math";

const STAR = "M0-10Q2.2-2.2 10 0Q2.2 2.2 0 10Q-2.2 2.2-10 0Q-2.2-2.2 0-10Z";
const STAR_BOX = 24;
const RING = 1.2;
const FADE_IN = { from: 760, to: 1060 } as const;
const MIN_SCALE = 0.4;
const SPIN = 0.6;

type Sparkle = (typeof SPARKLES)[number];

export function Sparkles({
	eng,
	fa,
	geo,
	color,
}: {
	eng: SharedValue<Eng>;
	fa: SharedValue<number>;
	geo: Geo;
	color: string;
}) {
	return (
		<>
			{SPARKLES.map((s) => (
				<SparkleView
					color={color}
					eng={eng}
					fa={fa}
					geo={geo}
					key={s.turn}
					s={s}
				/>
			))}
		</>
	);
}

function SparkleView({
	s,
	eng,
	fa,
	geo,
	color,
}: {
	s: Sparkle;
	eng: SharedValue<Eng>;
	fa: SharedValue<number>;
	geo: Geo;
	color: string;
}) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		if (e.rm || e.phase !== PH.badge) {
			return { opacity: 0 };
		}
		const c = coinAt(e, geo);
		const on = easeOut(seg(c.a, FADE_IN.from, FADE_IN.to)) * (1 - c.close);
		const l = Math.sin((fa.get() / SPARKLE_MS + s.ph) * TAU);
		const lit = l > 0 ? l * l : 0;
		const ang = s.turn * TAU;
		const reach = c.r * RING;
		const size = (s.r * c.r * 2 * 2) / STAR_BOX;
		return {
			opacity: lit * on,
			transform: [
				{ translateX: geo.cx + Math.cos(ang) * reach - STAR_BOX / 2 },
				{ translateY: c.cy + Math.sin(ang) * reach - STAR_BOX / 2 },
				{ scale: size * (MIN_SCALE + (1 - MIN_SCALE) * lit) },
				{ rotate: `${lit * SPIN}rad` },
			],
		};
	});
	return (
		<Animated.View
			className="absolute top-0 left-0"
			pointerEvents="none"
			style={[{ height: STAR_BOX, opacity: 0, width: STAR_BOX }, style]}
		>
			<Svg height={STAR_BOX} viewBox="-10 -10 20 20" width={STAR_BOX}>
				<Path d={STAR} fill={color} />
			</Svg>
		</Animated.View>
	);
}
