import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { useTokenColors } from "@/lib/use-token-color";
import { STORY, XOLACERS, xolacerLabel } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { ease, fs, lerp, mod, seg } from "../first-run-motion";
import { BEAT_COLORS, css, ink, STORY_COLORS } from "../first-run-palette";
import { ageOf, type SEng, XS } from "./story-scene";

const PEACH = BEAT_COLORS.xolacers.lit;

const SLOTS = [
	{ o: 1, r: -2, s: 1, x: 0, y: 0 },
	{ o: 0.82, r: 5, s: 0.95, x: 12, y: 10 },
	{ o: 0.55, r: -7, s: 0.9, x: -10, y: 18 },
];

function Face({ j }: { j: number }) {
	const n = j + 1;
	const [bg, hair, skin, shoulders] = useTokenColors([
		`first-run-face-${n}-bg`,
		`first-run-face-${n}-hair`,
		`first-run-face-${n}-skin`,
		"first-run-shoulders",
	]);
	return (
		<View
			className="size-13 overflow-hidden rounded-full"
			style={{ boxShadow: `0 0 0 2px ${css(PEACH, 0.35)}` }}
		>
			<Svg height={52} viewBox="0 0 100 100" width={52}>
				<Rect fill={bg} height={100} width={100} />
				<Path d="M18 104c2-20 15-31 32-31s30 11 32 31z" fill={shoulders} />
				<Ellipse cx={50} cy={48} fill={skin} rx={17} ry={20} />
				<Path
					d="M31 46c0-16 9-26 20-26s20 10 20 25c-6-6-13-9-21-9-7 0-14 4-19 10z"
					fill={hair}
				/>
				<Rect fill={skin} height={10} rx={4} width={12} x={44} y={64} />
			</Svg>
		</View>
	);
}

const CARD_TOKENS = [
	"first-run-card-1",
	"first-run-card-2",
	"first-run-card-shadow",
] as const;

export function XoCard({ eng, j }: { eng: SharedValue<SEng>; j: number }) {
	const x = XOLACERS[j];
	const [card1, card2, cardShadow] = useTokenColors(CARD_TOKENS);
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const slot = mod(j - e.xk, 3);
		const S = SLOTS[slot];
		const fa = ageOf(e, e.flyAt);
		let px = S.x;
		let py = S.y;
		let r = S.r;
		let s = S.s;
		let o = S.o;
		let z = 3 - slot;
		if (fa >= 0 && j === e.flyFrom && fa < 420) {
			const q = ease(fa / 420);
			px = e.flyDir * (Math.abs(e.xdx0) + 40 + 380 * q);
			py = -10 * q;
			r = e.flyDir * (6 + 14 * q);
			s = 1;
			o = 1 - seg(fa, 220, 420);
			z = 4;
		} else if (fa >= 0 && j === e.flyFrom) {
			const q = ease(seg(fa, 420, 760));
			py = S.y + 10 * (1 - q);
			o = S.o * q;
		} else if (fa >= 0 && fa < 900) {
			const P = SLOTS[Math.min(2, slot + 1)];
			const q = e.rm ? 1 : fs(fa / 1000, 13, 0.7);
			px = lerp(P.x, S.x, q);
			py = lerp(P.y, S.y, q);
			r = lerp(P.r, S.r, q);
			s = lerp(P.s, S.s, q);
			o = lerp(P.o, S.o, q);
		} else if (e.xdx !== 0) {
			if (slot === 0) {
				px += e.xdx;
				r += e.xdx / 16;
			}
			if (slot === 1) {
				const k = Math.min(1, Math.abs(e.xdx) / 160);
				s = lerp(S.s, 1, k * 0.5);
				o = lerp(S.o, 1, k * 0.5);
			}
		}
		return {
			opacity: o,
			transform: [
				{ translateX: px },
				{ translateY: py },
				{ rotate: `${r}deg` },
				{ scale: s },
			],
			zIndex: z,
		};
	});
	return (
		<Animated.View
			accessibilityLabel={xolacerLabel(x)}
			accessible
			className="absolute top-0 left-0 rounded-[26px] border-continuous"
			style={[
				{
					boxShadow: `0 18px 40px -16px ${cardShadow}`,
					height: XS.h,
					transformOrigin: "50% 90%",
					width: XS.w,
				},
				style,
			]}
		>
			<LinearGradient
				className="flex-1 rounded-[26px] border-[0.5px] border-continuous border-first-run-card-edge px-4.5 pt-4.5 pb-4"
				colors={[card1, card2]}
			>
				<View className="flex-row items-center gap-3">
					<Face j={j} />
					<View>
						<AppText
							className="text-[19px] leading-[23px] tracking-[-0.19px]"
							maxFontSizeMultiplier={BOARD_TEXT_MAX}
							style={{ color: css(STORY_COLORS.ink) }}
							weight="semibold"
						>
							{x.name}
						</AppText>
						<AppText
							className="mt-0.5 text-[12px] leading-[15px]"
							maxFontSizeMultiplier={BOARD_TEXT_MAX}
							style={{ color: ink(0.5) }}
						>
							{x.since}
						</AppText>
					</View>
				</View>
				<AppText
					className="mt-4.5 text-[10px] uppercase leading-[12px] tracking-[1.4px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: css(PEACH, 0.75) }}
					weight="semibold"
				>
					{STORY.xolacersTopics}
				</AppText>
				<View className="mt-[9px] flex-row flex-wrap gap-1.5">
					{x.topics.map((t) => (
						<View
							className="rounded-full px-2.5 py-[5px]"
							key={t}
							style={{ backgroundColor: css(PEACH, 0.1) }}
						>
							<AppText
								className="text-[12.5px] leading-[16px]"
								maxFontSizeMultiplier={BOARD_TEXT_MAX}
								style={{ color: ink(0.85) }}
							>
								{t}
							</AppText>
						</View>
					))}
				</View>
				<View className="mt-auto flex-row items-center gap-[7px]">
					<View className="size-1.5 rounded-full bg-first-run-online" />
					<AppText
						className="text-[12px] leading-[15px]"
						maxFontSizeMultiplier={BOARD_TEXT_MAX}
						style={{ color: ink(0.55) }}
					>
						{x.when}
					</AppText>
				</View>
			</LinearGradient>
		</Animated.View>
	);
}
