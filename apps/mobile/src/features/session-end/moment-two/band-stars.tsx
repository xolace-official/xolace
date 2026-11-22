import {
	BlurMask,
	Canvas,
	Circle,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { SessionColors } from "../session-colors";
import { EASE, TS } from "../session-look";
import { clamp01 } from "../timeline";
import { blinkAt, DRAW, starLit, starPop } from "./band-geo";

const HALO_BOX = (DRAW.halo + DRAW.haloBlur * 3) * 2;
const BLINK_BOX = (DRAW.blink + DRAW.blinkBlur * 3) * 2 * 1.6;

export function BandStar({
	k,
	x,
	y,
	color,
	c2,
	cs,
	reduced,
}: {
	k: number;
	x: number;
	y: number;
	color: string;
	c2: SharedValue<number>;
	cs: SharedValue<number>;
	reduced: boolean;
}) {
	const F = DRAW.faint;
	const L = DRAW.lit;
	const group = useAnimatedStyle(() => {
		const p = starPop(c2.get(), k, reduced);
		const l = starLit(cs.get(), k, reduced);
		const s = reduced
			? F.scale + (L.scale - F.scale) * l
			: (0.6 + 0.4 * p) * (F.scale + (L.scale - F.scale) * EASE.star(l));
		return {
			opacity: clamp01(p) * (F.alpha + (L.alpha - F.alpha) * EASE.css(l)),
			transform: [{ scale: s }],
		};
	});
	const halo = useAnimatedStyle(() => {
		const c = cs.get();
		const h =
			c < 0
				? 0
				: reduced
					? clamp01((c - TS.reducedLand) / 200)
					: EASE.css(clamp01((c - TS.land) / TS.lit.ms));
		return { opacity: F.halo + (L.halo - F.halo) * h };
	});
	const blink = useAnimatedStyle(() => {
		const b = blinkAt(cs.get(), k, reduced);
		return { opacity: b.a, transform: [{ scale: b.s / 1.6 }] };
	});
	return (
		<>
			<Animated.View
				className="absolute"
				style={[
					{
						height: HALO_BOX,
						left: x - HALO_BOX / 2,
						top: y - HALO_BOX / 2,
						width: HALO_BOX,
					},
					group,
				]}
			>
				<Animated.View className="absolute inset-0" style={halo}>
					<Canvas style={{ flex: 1 }}>
						<Circle
							color={color}
							cx={HALO_BOX / 2}
							cy={HALO_BOX / 2}
							r={DRAW.halo}
						>
							<BlurMask blur={DRAW.haloBlur} style="normal" />
						</Circle>
					</Canvas>
				</Animated.View>
				<View
					className="absolute rounded-full"
					style={{
						backgroundColor: color,
						height: DRAW.core * 2,
						left: HALO_BOX / 2 - DRAW.core,
						top: HALO_BOX / 2 - DRAW.core,
						width: DRAW.core * 2,
					}}
				/>
			</Animated.View>
			<Animated.View
				className="absolute"
				style={[
					{
						height: BLINK_BOX,
						left: x - BLINK_BOX / 2,
						top: y - BLINK_BOX / 2,
						width: BLINK_BOX,
					},
					blink,
				]}
			>
				<Canvas style={{ flex: 1 }}>
					<Circle
						color={color}
						cx={BLINK_BOX / 2}
						cy={BLINK_BOX / 2}
						r={DRAW.blink * 1.6}
					>
						<BlurMask blur={DRAW.blinkBlur * 1.6} style="normal" />
					</Circle>
				</Canvas>
			</Animated.View>
		</>
	);
}

const ME_BOX = (DRAW.me.halo + DRAW.me.haloBlur * 3) * 2;

export function YouStar({
	x,
	y,
	colors,
	cs,
	breath,
	reduced,
}: {
	x: number;
	y: number;
	colors: SessionColors;
	cs: SharedValue<number>;
	breath: SharedValue<number>;
	reduced: boolean;
}) {
	const M = DRAW.me;
	const c = { core: colors.you, halo: colors.youHalo };
	const land = useAnimatedStyle(() => {
		const t = cs.get();
		if (t < 0) {
			return { opacity: 0, transform: [{ scale: M.from }] };
		}
		if (reduced) {
			return {
				opacity: clamp01((t - TS.reducedLand) / 200),
				transform: [{ scale: 1 }],
			};
		}
		const e = t - TS.land;
		return {
			opacity:
				clamp01(e / TS.me.fade) *
				(M.breathLow + (1 - M.breathLow) * breath.get()),
			transform: [
				{
					scale:
						e <= 0
							? M.from
							: M.from + (1 - M.from) * EASE.pop(clamp01(e / TS.me.ms)),
				},
			],
		};
	});
	const C = ME_BOX / 2;
	return (
		<Animated.View
			className="absolute"
			style={[{ height: ME_BOX, left: x - C, top: y - C, width: ME_BOX }, land]}
		>
			<Canvas style={{ flex: 1 }}>
				<Circle color={c.halo} cx={C} cy={C} opacity={M.haloA} r={M.halo}>
					<BlurMask blur={M.haloBlur} style="normal" />
				</Circle>
				<Circle cx={C} cy={C} r={M.core}>
					<RadialGradient
						c={vec(C - 0.1 * M.core * 2, C - 0.14 * M.core * 2)}
						colors={[...c.core]}
						positions={[0, 0.5, 1]}
						r={0.7 * M.core * 2}
					/>
				</Circle>
			</Canvas>
		</Animated.View>
	);
}
