import {
	Blur,
	Canvas,
	RadialGradient,
	Rect,
	vec,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { clearOf } from "../clear-of";
import type { SessionColors } from "../session-colors";
import { FOLLOW, LAYOUT, T1 } from "../session-look";
import { appear } from "../timeline";
import type { FaceFit } from "./fit";

const L = LAYOUT.light;
const S = LAYOUT.shadow;
/** Room above and below the box for the blur (σ 36, two σ). */
const PAD = 72;
const FLOAT = { ...FOLLOW.floatSpring, ...PLAY_AS_CHOSEN };

type Props = {
	W: number;
	/** Board y → device y. */
	y: (v: number) => number;
	/** Moment 1's place under large Dynamic Type (the face's centre moved and scaled). */
	fit: FaceFit;
	/** The slider's position (u = (pos − .5) · 2). */
	pos: SharedValue<number>;
	grab: SharedValue<number>;
	clock: SharedValue<number>;
	colors: SessionColors;
	reduced: boolean;
};

/**
 * Board `.wash` and `.fsh`: the light behind the face and its shadow, both
 * reading the slider's one value. The three lights are radial gradients
 * (closest side) blurred 36, drawn once each; only their views' opacity moves
 * (.4 s, .15 s while dragging), so nothing redraws during a drag.
 */
export function FaceLight({
	W,
	y,
	fit,
	pos,
	grab,
	clock,
	colors,
	reduced,
}: Props) {
	const cool = useSharedValue(0);
	const warm = useSharedValue(0);
	const shadowS = useSharedValue(1);
	const shadowA = useSharedValue<number>(FOLLOW.shadowA);

	useAnimatedReaction(
		() => (pos.get() - 0.5) * 2,
		(u, was) => {
			if (u === was) {
				return;
			}
			const up = Math.max(0, u);
			const down = Math.max(0, -u);
			let ms: number = grab.get() ? FOLLOW.lightDragMs : FOLLOW.lightMs;
			if (reduced) {
				ms = 0;
			}
			const fade = { duration: ms, ...PLAY_AS_CHOSEN };
			cool.set(ms ? withTiming(down, fade) : down);
			warm.set(ms ? withTiming(up, fade) : up);
			const s = 1 - FOLLOW.shadowUp * up + FOLLOW.shadowDown * down;
			const a =
				FOLLOW.shadowA - FOLLOW.shadowAUp * up + FOLLOW.shadowADown * down;
			shadowS.set(reduced ? s : withSpring(s, FLOAT));
			shadowA.set(
				reduced
					? a
					: withTiming(a, { duration: FOLLOW.shadowAMs, ...PLAY_AS_CHOSEN })
			);
		}
	);

	const box = useAnimatedStyle(() => ({
		opacity: appear(clock.get(), T1.light.at, T1.light.ms, reduced).opacity,
	}));
	const cStyle = useAnimatedStyle(() => ({ opacity: cool.get() }));
	const wStyle = useAnimatedStyle(() => ({ opacity: warm.get() }));
	const shadow = useAnimatedStyle(() => ({
		opacity:
			appear(clock.get(), T1.shadow.at, T1.shadow.ms, reduced).opacity *
			shadowA.get(),
		transform: [{ scale: shadowS.get() * fit.fit }],
	}));

	const bw = W - L.side * 2;
	const [neutral, coolC, warmC] = colors.light;
	// The shadow's top follows the face's scaled centre under large Dynamic Type.
	const below = LAYOUT.shadow.top - LAYOUT.face.top - LAYOUT.face.size / 2;
	return (
		<View
			accessibilityElementsHidden
			className="absolute inset-0"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
		>
			<Animated.View
				className="absolute"
				style={[
					{
						height: L.height + PAD * 2,
						left: L.side,
						top: y(L.top) + fit.dy - PAD,
						width: bw,
					},
					box,
				]}
			>
				<Layer color={neutral} opacity={FOLLOW.neutralA} w={bw} />
				<Layer color={coolC} style={cStyle} w={bw} />
				<Layer color={warmC} style={wStyle} w={bw} />
			</Animated.View>
			<Animated.View
				className="absolute rounded-full"
				style={[
					{
						height: S.h,
						left: (W - S.w) / 2,
						top: y(S.top) + fit.dy + below * (fit.fit - 1),
						width: S.w,
					},
					shadow,
				]}
			>
				<View
					className="flex-1 rounded-full"
					style={{
						experimental_backgroundImage: `radial-gradient(closest-side, ${colors.shadow}, ${clearOf(colors.shadow)})`,
					}}
				/>
			</Animated.View>
		</View>
	);
}

type LayerProps = {
	w: number;
	color: string;
	opacity?: number;
	style?: ReturnType<typeof useAnimatedStyle>;
};

/** One light: an ellipse filling the box, the colour at its centre to clear at its edge, blurred 36. */
function Layer({ w, color, opacity, style }: LayerProps) {
	const h = L.height;
	const c = vec(w / 2, PAD + h / 2);
	return (
		<Animated.View
			className="absolute top-0 left-0"
			style={[{ height: h + PAD * 2, opacity, width: w }, style]}
		>
			<Canvas style={{ flex: 1 }}>
				<Rect height={h + PAD * 2} width={w} x={0} y={0}>
					<RadialGradient
						c={c}
						colors={[color, clearOf(color)]}
						origin={c}
						r={h / 2}
						transform={[{ scaleX: w / h }]}
					/>
					<Blur blur={L.blur} />
				</Rect>
			</Canvas>
		</Animated.View>
	);
}
