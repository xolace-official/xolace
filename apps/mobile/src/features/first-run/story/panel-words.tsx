import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AnimatedAppText, AppText } from "@/components/shared/app-text";
import { PATTERN } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { clamp, ease, easeIO, lerp, mixRGB, seg } from "../first-run-motion";
import { BEAT_COLORS, css, ink, STORY_COLORS } from "../first-run-palette";
import { type SEng, SKY } from "./story-scene";

export const SIG = PATTERN.signal.map(([x, y, t]) => ({
	sig: true,
	t,
	x: 18 + (x / 100) * 306,
	y: 44 + (y / 40) * 170,
}));
const NOI = PATTERN.noise.map(([x, y, t]) => ({ sig: false, t, x, y }));
export const WORDS = [...SIG, ...NOI];
export const C = { x: SKY.w / 2, y: SKY.h / 2 };
export const DOT = 5;
const TXT = { a: STORY_COLORS.ink, b: STORY_COLORS.panel.signal };
const LAV = BEAT_COLORS.plus.lit;
const LAV_HOT = BEAT_COLORS.plus.hot;
export const zoomOf = (e: SEng) => {
	"worklet";
	return e.rm ? 1 : clamp(e.zoom);
};
export const scaleOf = (z: number) => {
	"worklet";
	return 1.9 - 0.9 * easeIO(z);
};

export function PanelWord({ eng, k }: { eng: SharedValue<SEng>; k: number }) {
	const w = WORDS[k];
	const style = useAnimatedStyle(() => {
		const z = zoomOf(eng.get());
		if (w.sig) {
			const o = 1 - seg(z, 0.7, 0.95);
			return {
				color: css(mixRGB(TXT.a, TXT.b, z), o),
				textShadowColor: css(LAV_HOT, 0.5 * seg(z, 0.6, 0.8) * o),
				textShadowRadius: z > 0.6 ? 10 : 0,
			};
		}
		return {
			color: ink(lerp(0.78, 0.18, seg(z, 0.2, 0.8))),
			textShadowColor: "transparent",
			textShadowRadius: 0,
		};
	});
	return (
		<AnimatedAppText
			className="absolute text-[13.5px] leading-[16px]"
			maxFontSizeMultiplier={BOARD_TEXT_MAX}
			numberOfLines={1}
			style={[
				{
					left: w.sig ? w.x + DOT : w.x,
					textShadowOffset: { height: 0, width: 0 },
					top: w.y - 8,
				},
				style,
			]}
		>
			{w.t}
		</AnimatedAppText>
	);
}

export function Note({ eng, i }: { eng: SharedValue<SEng>; i: number }) {
	const n = PATTERN.notes[i];
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const z = zoomOf(e);
		const q = e.rm ? 1 : ease(seg(z, 0.82 + i * 0.05, 0.97 + i * 0.01));
		return { opacity: q, transform: [{ translateY: 6 * (1 - q) }] };
	});
	return (
		<Animated.View
			className="absolute gap-px"
			style={[{ left: n.x, top: n.y }, style]}
		>
			<AppText
				className="text-[10px] uppercase leading-[12px] tracking-[1.2px]"
				maxFontSizeMultiplier={BOARD_TEXT_MAX}
				style={{ color: css(LAV, 0.6) }}
				weight="semibold"
			>
				{n.a}
			</AppText>
			<AppText
				className="text-[15px] text-first-run-panel-note leading-[18px]"
				maxFontSizeMultiplier={BOARD_TEXT_MAX}
				weight="semibold"
			>
				{n.b}
			</AppText>
		</Animated.View>
	);
}
