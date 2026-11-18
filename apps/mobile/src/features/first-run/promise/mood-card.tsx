import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AnimatedAppText, AppText } from "@/components/shared/app-text";
import { Image, LinearGradient } from "@/components/shared/styled";
import { MOOD_WORDS, PROMISE } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { mixRGB, type Stage } from "../first-run-motion";
import { css, MOOD_COLORS } from "../first-run-palette";
import { cardPose, namePose, type PEng } from "./promise-scene";

/** Production's MoodCard: 55% of the width, 6 pt in, 24 pt corners, a dark foot under the word. */
const WIDTH_RATIO = 0.55;
export const CARD = { h: 363, inset: 6, radius: 24, top: 87 };
/** The word's line (18 pt); the answer sits 3 below it without moving it (board `height: 0`). */
const WORD_LH = 22;
const REST_ALPHA = 0.82;

/** Production's mood art, in `MOOD_WORDS` order. */
const MOOD_IMAGES = [
	require("@/assets/images/onboarding/heavy-mini.jpeg"),
	require("@/assets/images/onboarding/Anxious-mini.jpeg"),
	require("@/assets/images/onboarding/numb-mini.jpeg"),
	require("@/assets/images/onboarding/restless-mini.jpeg"),
	require("@/assets/images/onboarding/Confused-mini.jpeg"),
	require("@/assets/images/onboarding/Overwhelmed-min.jpeg"),
	require("@/assets/images/onboarding/Uncertain-mini.jpeg"),
	require("@/assets/images/onboarding/Lost-mini.jpeg"),
] as const;

export const cardWidth = (W: number) => W * WIDTH_RATIO;

/** One mood card on the belt: its place, lean and stretch come from the promise's engine. */
export function MoodCard({
	i,
	eng,
	stage,
}: {
	i: number;
	eng: SharedValue<PEng>;
	stage: Stage;
}) {
	const cw = cardWidth(stage.W);
	const card = useAnimatedStyle(() => {
		const p = cardPose(eng.get(), i, cw, stage.W);
		const off = p.x > stage.W + 10 || p.x < -cw - 10;
		return {
			opacity: off ? 0 : p.op,
			shadowOpacity: 0.5 * p.lift,
			transform: [
				{ translateX: p.x },
				{ translateY: p.ty },
				{ rotate: `${p.rot}deg` },
				{ scale: p.sc },
				{ skewX: `${p.skew}deg` },
				{ scaleX: 1 + p.st },
				{ scaleY: 1 - p.st / 3 },
			],
		};
	});
	const word = useAnimatedStyle(() => {
		const n = namePose(eng.get(), i);
		const { rest, warm } = MOOD_COLORS.word;
		return {
			color: css(
				mixRGB(rest, warm, n.warm),
				REST_ALPHA + (1 - REST_ALPHA) * n.warm
			),
			textShadowRadius: 10 * n.gl,
		};
	});
	const line = useAnimatedStyle(() => {
		const n = namePose(eng.get(), i);
		return { opacity: n.line, transform: [{ translateY: n.dy }] };
	});
	return (
		<Animated.View
			className="absolute top-0 left-0"
			style={[
				{
					height: CARD.h,
					padding: CARD.inset,
					shadowColor: MOOD_COLORS.lift,
					shadowOffset: { height: 10, width: 0 },
					shadowRadius: 22,
					transformOrigin: "50% 100%",
					width: cw,
				},
				card,
			]}
		>
			<View
				className="flex-1 overflow-hidden border-continuous"
				style={{
					backgroundColor: css(MOOD_COLORS.card),
					borderRadius: CARD.radius,
				}}
			>
				<Image
					accessible={false}
					className="absolute inset-0"
					contentFit="cover"
					source={MOOD_IMAGES[i]}
				/>
				<LinearGradient
					className="absolute inset-0"
					colors={MOOD_COLORS.foot}
					locations={[0.4, 1]}
				/>
				<View className="absolute right-4 bottom-5.5 left-5.5">
					<AnimatedAppText
						maxFontSizeMultiplier={BOARD_TEXT_MAX}
						numberOfLines={1}
						style={[
							{
								fontSize: 18,
								letterSpacing: 1,
								lineHeight: WORD_LH,
								textShadowColor: MOOD_COLORS.word.glow,
								textShadowOffset: { height: 0, width: 0 },
							},
							word,
						]}
						weight="medium"
					>
						{MOOD_WORDS[i]}
					</AnimatedAppText>
					<Animated.View
						className="absolute left-0"
						style={[{ top: WORD_LH + 3 }, line]}
					>
						<AppText
							maxFontSizeMultiplier={BOARD_TEXT_MAX}
							numberOfLines={1}
							style={{
								color: css(MOOD_COLORS.answer),
								fontSize: 13.5,
								lineHeight: 17.5,
								width: 200,
							}}
							weight="medium"
						>
							{PROMISE.named}
						</AppText>
					</Animated.View>
				</View>
			</View>
		</Animated.View>
	);
}
