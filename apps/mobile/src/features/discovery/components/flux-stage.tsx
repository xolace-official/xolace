import { Blur, Canvas, Oval } from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

// Trimmed to its alpha bounding box (492x964); the raw cutout rendered at half size.
const FLUX = require("@/assets/images/flux/flux-whisper.png");

/** Mouth position as a fraction of the trimmed sprite (417 of 964px). The speech tail sits here. */
export const MOUTH_Y = 0.433;

// Eye boxes as sprite fractions plus the skin tone sampled above each. These are
// properties of the PNG, not the theme, hence literals. Re-measure if regenerated.
const EYES = [
	{ cx: 0.457, cy: 0.355, h: 0.099, skin: "#F6CE94", w: 0.122 },
	{ cx: 0.817, cy: 0.344, h: 0.088, skin: "#FAC4B1", w: 0.085 },
];

/** Headroom around the glow so its blur is never clipped by the canvas edge. */
const GLOW_PAD = 14;

const styles = StyleSheet.create({
	glow: { bottom: 0, height: 30, position: "absolute" },
	lid: { position: "absolute", transformOrigin: "50% 0%" },
	// Sway pivots at the feet. Percentages, not keywords: transformOrigin is
	// x-then-y, so "bottom center" is rejected and the sway pivots mid-body.
	sprite: { transformOrigin: "50% 100%" },
});

/** One eyelid. Each needs its own `useAnimatedStyle`: one style shared by two views renders
 * neither. */
function Lid({
	eye,
	w,
	h,
	lid,
}: {
	eye: (typeof EYES)[number];
	w: number;
	h: number;
	lid: SharedValue<number>;
}) {
	// Oversized so no sliver of eye survives the closed frame.
	const ew = eye.w * w * 1.14;
	const eh = eye.h * h * 1.12;
	const style = useAnimatedStyle(() => ({
		transform: [{ scaleY: lid.get() }],
	}));

	return (
		<Animated.View
			style={[
				styles.lid,
				{
					backgroundColor: eye.skin,
					borderRadius: ew / 2,
					height: eh,
					left: eye.cx * w - ew / 2,
					top: eye.cy * h - eh / 2,
					width: ew,
				},
				style,
			]}
		/>
	);
}

/** Flux sprite with a foot-rooted sway, a breathing glow and a coded blink; never moved as a
 * whole (reads as a sticker). `reduced` freezes all three. */
export function FluxStage({
	w = 53,
	h = 104,
	reduced = false,
}: {
	w?: number;
	h?: number;
	reduced?: boolean;
}) {
	// `--ember` is a project variable outside heroui's key union, hence the cast.
	const ember = useThemeColor("ember" as never) as string;
	const t = useSharedValue(0);
	const lid = useSharedValue(0);

	useEffect(() => {
		if (reduced) {
			t.set(0.5);
			return;
		}
		t.set(
			withRepeat(
				withSequence(
					withTiming(1, { duration: 2600 }),
					withTiming(0, { duration: 2600 })
				),
				-1,
				false
			)
		);
	}, [t, reduced]);

	useEffect(() => {
		if (reduced) {
			return;
		}
		let id: ReturnType<typeof setTimeout>;
		const schedule = () => {
			// Irregular on purpose; a metronome blink is worse than none.
			id = setTimeout(
				() => {
					lid.set(
						withSequence(
							withTiming(1, { duration: 90, easing: Easing.in(Easing.quad) }),
							withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) })
						)
					);
					schedule();
				},
				3200 + Math.random() * 3600
			);
		};
		schedule();
		return () => clearTimeout(id);
	}, [lid, reduced]);

	const glow = useDerivedValue(() => 0.14 + t.get() * 0.13);
	const sway = useAnimatedStyle(() => ({
		transform: [{ rotate: `${-0.9 + t.get() * 1.8}deg` }],
	}));

	return (
		<View style={{ height: h + 10, width: w }}>
			{/* Padded past the oval: a blur clipped to its canvas reads as a grey box. */}
			<Canvas
				opaque={false}
				style={[styles.glow, { left: -GLOW_PAD, width: w + GLOW_PAD * 2 }]}
			>
				<Oval
					color={ember}
					height={12}
					opacity={glow}
					width={w * 0.88}
					x={GLOW_PAD + w * 0.06}
					y={12}
				>
					<Blur blur={8} mode="decal" />
				</Oval>
			</Canvas>
			<Animated.View style={[{ height: h, width: w }, styles.sprite, sway]}>
				<Image
					contentFit="contain"
					source={FLUX}
					style={{ height: h, width: w }}
				/>
				{!reduced &&
					EYES.map((e) => <Lid eye={e} h={h} key={e.cx} lid={lid} w={w} />)}
			</Animated.View>
		</View>
	);
}
