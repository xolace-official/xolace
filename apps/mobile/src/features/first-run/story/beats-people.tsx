import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { FONTS } from "@/design/type";
import { STORY, XOLACERS, xolacerLabel } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { ease, fs, lerp, mod, seg } from "../first-run-motion";
import {
	BEAT_COLORS,
	css,
	FACE_COLORS,
	ink,
	STORY_COLORS,
} from "../first-run-palette";
import { BeatSection, useIn } from "./beat-parts";
import { ageOf, bIf, type SEng, XS } from "./story-scene";
import { XoCard } from "./xolacer-card";

const DONE = 450 + STORY.count * 62;
const PEACH = BEAT_COLORS.xolacers.lit;

/** 4 · This week: the count is drawn in the words canvas, its embers in the points canvas. */
export function BeatWeek({ eng }: { eng: SharedValue<SEng> }) {
	const caption = useIn(eng, 3, DONE - 150, 500, 6);
	const quote = useIn(eng, 3, DONE + 450, 600, 10);
	const by = useIn(eng, 3, DONE + 750, 500, 0);
	return (
		<BeatSection eng={eng} i={3}>
			<View
				accessibilityLabel={`${STORY.count} ${STORY.countCaption.join(" ")}`}
				accessible
				className="absolute inset-x-10 top-[318px] h-[110px]"
			/>
			<Animated.View
				accessibilityElementsHidden
				className="absolute inset-x-10 top-[430px]"
				importantForAccessibility="no-hide-descendants"
				style={caption}
			>
				<AppText
					className="text-center text-[14.5px] leading-[22px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: ink(0.62) }}
				>
					{STORY.countCaption.join("\n")}
				</AppText>
			</Animated.View>
			<Animated.View
				className="absolute top-[574px] right-9 left-8 flex-row gap-3.5"
				style={quote}
			>
				<View
					className="mt-[9px] size-[7px] rounded-full"
					style={{
						backgroundColor: STORY_COLORS.quoteDot,
						boxShadow: STORY_COLORS.quoteDotGlow,
					}}
				/>
				<AppText
					className="flex-1 text-[20px] leading-[27px] tracking-[-0.3px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: ink(0.92), fontFamily: FONTS.displaySemi }}
				>
					{STORY.quote}
				</AppText>
			</Animated.View>
			<Animated.View className="absolute top-160 left-[53px]" style={by}>
				<AppText
					className="text-[12px] leading-[15px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: ink(0.45) }}
				>
					{STORY.quoteBy}
				</AppText>
			</Animated.View>
		</BeatSection>
	);
}

/** 5 · Xolacers: three people's cards to swipe through, and you as a mask. */
export function BeatXolacers({ eng }: { eng: SharedValue<SEng> }) {
	const pile = useAnimatedStyle(() => {
		const e = eng.get();
		const bb = bIf(e, 4);
		if (e.rm) {
			return { opacity: Math.min(1, bb / 200), transform: [{ translateY: 0 }] };
		}
		return {
			opacity: ease(seg(bb, 600, 1200)),
			transform: [{ translateY: 20 * (1 - fs((bb - 600) / 1000, 9, 0.75)) }],
		};
	});
	const you = useIn(eng, 4, 900, 600, 14);
	const hint = useAnimatedStyle(() => {
		const e = eng.get();
		return {
			opacity: e.rm
				? 0.8
				: 0.8 * ease(seg(bIf(e, 4), 1900, 2400)) * (e.xMoved ? 0 : 1),
		};
	});
	return (
		<BeatSection eng={eng} i={4}>
			<Animated.View
				className="absolute"
				style={[{ height: XS.h, left: XS.x, top: XS.y, width: XS.w }, pile]}
			>
				{XOLACERS.map((p, j) => (
					<XoCard eng={eng} j={j} key={p.name} />
				))}
			</Animated.View>
			<Animated.View
				accessibilityLabel={`${STORY.you.title}. ${STORY.you.sub.replace("\n", " ")}`}
				accessible
				className="absolute top-[470px] left-6 h-34 w-26 items-center justify-center gap-1.5 rounded-[22px] border border-continuous"
				style={[
					{ backgroundColor: STORY_COLORS.youFill, borderColor: ink(0.1) },
					you,
				]}
			>
				<Svg height={26} viewBox="0 0 40 26" width={40}>
					<Path
						d="M2 5c6-3 12-4 18-4s12 1 18 4c0 9-5 18-18 20C7 23 2 14 2 5z"
						fill={ink(0.32)}
						opacity={0.9}
					/>
					<Ellipse
						cx={12.5}
						cy={11}
						fill={STORY_COLORS.mask}
						rx={4.2}
						ry={2.6}
					/>
					<Ellipse
						cx={27.5}
						cy={11}
						fill={STORY_COLORS.mask}
						rx={4.2}
						ry={2.6}
					/>
				</Svg>
				<AppText
					className="text-[14px] leading-[17px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: ink(0.8) }}
					weight="semibold"
				>
					{STORY.you.title}
				</AppText>
				<AppText
					className="text-center text-[11.5px] leading-[15.5px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: ink(0.45) }}
				>
					{STORY.you.sub}
				</AppText>
			</Animated.View>
			<Animated.View
				className="absolute top-163"
				pointerEvents="none"
				style={[{ left: XS.x, width: XS.w }, hint]}
			>
				<AppText
					className="text-center text-[12px] leading-[15px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: ink(0.42) }}
				>
					{STORY.xolacersHint}
				</AppText>
			</Animated.View>
		</BeatSection>
	);
}
