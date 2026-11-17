import {
	Canvas,
	Circle,
	Group,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import { type PeersColors, withAlpha } from "../peers-colors";
import { EASE } from "../peers-ease";
import { DRAW, T, TIMING, YOU } from "../peers-look";
import { loadBreath } from "./mark-geo";

const SIZE = 84;
const C = SIZE / 2;
/** `.s-none .you .hl`: scale 1.35, α .8. */
const NONE_HALO = { alpha: 0.8, scale: 1.35 } as const;
/** `yb`: you breathe α .82 ↔ 1. */
const BREATH_LOW = 0.82;
/** `ldb`'s delay for your ring (board `--ld: .2s`). */
const LD_DELAY = 200;
/** The halo's centre α, and the core's highlight offset and stops. */
const HALO_CORE = 0.7;
const HIGHLIGHT = { r: 1.4, x: 0.2, y: 0.28 } as const;

type Props = {
	ox: number;
	oy: number;
	none: boolean;
	loading: boolean;
	reduced: boolean;
	colors: PeersColors;
	ink3: string;
	arrive: SharedValue<number>;
	ld: SharedValue<number>;
	/** 0 → 1 → 0 on the face's breath (4.8 s, late 6.7 s). */
	breath: SharedValue<number>;
};

/**
 * Your star (board `.st.you`): the tile's lower circle as a ring until the first
 * card lands, then the warm star, halo r 30 and core r 7. Its own small canvas,
 * so its breath (`yb`, α .82 ↔ 1 on the face's clock) is the view's opacity and
 * never redraws the mark.
 */
export function YouStar({
	ox,
	oy,
	none,
	loading,
	reduced,
	colors,
	ink3,
	arrive,
	ld,
	breath,
}: Props) {
	const [lightC, midC, edgeC] = colors.ember;
	const since = (ms: number) => {
		"worklet";
		if (loading) {
			return 0;
		}
		const e = arrive.get() - T.first;
		if (e <= 0) {
			return 0;
		}
		return reduced ? clamp01(e / REDUCED_FADE_MS) : EASE.css(clamp01(e / ms));
	};
	const morph = useDerivedValue(() => since(TIMING.morph));
	const halo = useDerivedValue(() => since(TIMING.halo));
	const haloA = useDerivedValue(
		() => halo.get() * (none ? NONE_HALO.alpha : DRAW.haloA)
	);
	const haloT = useDerivedValue(() => [
		{ scale: 1 + ((none ? NONE_HALO.scale : 1) - 1) * halo.get() },
	]);
	const r = useDerivedValue(
		() => DRAW.ring + (DRAW.youCore - DRAW.ring) * morph.get()
	);
	const ringA = useDerivedValue(
		() =>
			DRAW.ringA *
			(1 - morph.get()) *
			(loading ? loadBreath(ld.get(), LD_DELAY) : 1)
	);
	const breathe = useAnimatedStyle(() => ({
		opacity:
			reduced || loading ? 1 : BREATH_LOW + (1 - BREATH_LOW) * breath.get(),
	}));
	const cr = DRAW.youCore;

	return (
		<Animated.View
			className="absolute"
			pointerEvents="none"
			style={[
				{
					height: SIZE,
					left: ox + YOU.x - C,
					top: oy + YOU.y - C,
					width: SIZE,
				},
				breathe,
			]}
		>
			<Canvas style={{ height: SIZE, width: SIZE }}>
				<Group opacity={haloA} origin={vec(C, C)} transform={haloT}>
					<Circle cx={C} cy={C} r={DRAW.youHalo}>
						<RadialGradient
							c={vec(C, C)}
							colors={[withAlpha(midC, HALO_CORE), withAlpha(midC, 0)]}
							r={DRAW.youHalo}
						/>
					</Circle>
				</Group>
				<Circle cx={C} cy={C} opacity={morph} r={r}>
					<RadialGradient
						c={vec(C - HIGHLIGHT.x * cr, C - HIGHLIGHT.y * cr)}
						colors={[lightC, midC, edgeC]}
						positions={[0, 0.5, 1]}
						r={HIGHLIGHT.r * cr}
					/>
				</Circle>
				<Circle
					color={ink3}
					cx={C}
					cy={C}
					opacity={ringA}
					r={r}
					strokeWidth={DRAW.ringW}
					style="stroke"
				/>
			</Canvas>
		</Animated.View>
	);
}
