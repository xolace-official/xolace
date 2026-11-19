import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { clearOf } from "@/design/clear-of";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { riseFn, TIMING } from "../today-motion";

/** The glow that passes over each word at 55% of its arrival (`today-gleam`). */
const GLEAM = { at: 0.55, radius: 16 } as const;
/** Blur is approximated: a soft copy (faint glyphs, a 5 pt halo) crossfades to the sharp word. */
const SOFT_RADIUS = 5;
/** The soft copy: faint glyphs (ink at 19%) under their halo (ink at 63%), as the board's blur. */
const SOFT = { glyphs: 0.19, halo: 0.63 } as const;
const RISE = 7;
/** margin-right .24em at 34 pt: 8. */
const WORD_GAP = "mr-2";

type Props = {
	text: string;
	intro: boolean;
	reduced: boolean;
	/** The launch cover is still up: the words wait, hidden (`TodayFrameValue.waiting`). */
	waiting: boolean;
};

/**
 * The greeting, word by word (gleam-line-intro's arrival): each word fades up
 * 7 pt out of a blur, 120 ms apart, and a warm gleam passes over it at 55%.
 * Real AppText per word, so the font and Dynamic Type still apply.
 */
export function Greeting({ text, intro, reduced, waiting }: Props) {
	const words = text.split(" ");
	return (
		<View
			accessibilityLabel={text}
			accessibilityRole="header"
			accessible
			className="mt-1.5 flex-row flex-wrap px-1"
		>
			{words.map((w, i) => (
				<Word
					gap={i < words.length - 1}
					index={i}
					// By place: a name that loads mid-intro adds its word and the rest play on.
					key={i}
					play={intro && !reduced}
					text={w}
					waiting={waiting}
				/>
			))}
		</View>
	);
}

function Word({
	text,
	index,
	play,
	waiting,
	gap,
}: {
	text: string;
	index: number;
	play: boolean;
	waiting: boolean;
	gap: boolean;
}) {
	const [ink, gleam] = useTokenColors(["foreground", "today-gleam"]);
	const p = useSharedValue(play ? 0 : 1);

	useEffect(() => {
		if (!play || waiting) {
			return;
		}
		p.set(
			withDelay(
				index * TIMING.wordGap,
				withTiming(1, {
					duration: TIMING.word,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				}),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [index, p, play, waiting]);

	// CSS keyframes 0 / 55 / 100%, the curve applied within each segment.
	const wrap = useAnimatedStyle(() => ({
		transform: [{ translateY: RISE * (1 - riseFn(p.get())) }],
	}));
	const sharp = useAnimatedStyle(() => {
		const a = riseFn(Math.min(1, p.get() / GLEAM.at));
		return { opacity: a * a };
	});
	const soft = useAnimatedStyle(() => {
		const a = riseFn(Math.min(1, p.get() / GLEAM.at));
		return { opacity: a * (1 - a) * 2 };
	});
	const glow = useAnimatedStyle(() => {
		const v = p.get();
		const up = riseFn(Math.min(1, v / GLEAM.at));
		const down = riseFn(Math.max(0, (v - GLEAM.at) / (1 - GLEAM.at)));
		return { opacity: v < GLEAM.at ? up : 1 - down };
	});

	const margin = gap ? WORD_GAP : undefined;
	if (!play) {
		return (
			<AppText
				className={margin}
				importantForAccessibility="no"
				variant="greeting"
			>
				{text}
			</AppText>
		);
	}
	return (
		<Animated.View
			className={margin}
			importantForAccessibility="no-hide-descendants"
			style={wrap}
		>
			<Animated.View className="absolute top-0 left-0" style={glow}>
				<AppText
					style={{
						color: gleam,
						textShadowColor: gleam,
						textShadowRadius: GLEAM.radius,
					}}
					variant="greeting"
				>
					{text}
				</AppText>
			</Animated.View>
			<Animated.View style={sharp}>
				<AppText variant="greeting">{text}</AppText>
			</Animated.View>
			<Animated.View className="absolute top-0 left-0" style={soft}>
				<AppText
					style={{
						color: clearOf(ink, SOFT.glyphs),
						textShadowColor: clearOf(ink, SOFT.halo),
						textShadowRadius: SOFT_RADIUS,
					}}
					variant="greeting"
				>
					{text}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}
