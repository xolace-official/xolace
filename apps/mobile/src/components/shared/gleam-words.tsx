import { View } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { gleamRows } from "@/components/shared/gleam-rows";
import { REDUCED_FADE_MS } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";

/** Board `glA`: .7 s a word; the gleam ≤ .3 at 42%, the 5 px blur as a soft copy. */
const WORD_MS = 700;
const GLEAM = { at: 0.42, max: 0.3, r: 8, width: 0.2 } as const;
const SOFT_R = 5;
const SOFT_INK = 0.25;
/** iOS draws a text shadow only with an offset set. */
const NO_OFFSET = { height: 0, width: 0 } as const;
const RISE = 7;
/** `glA`'s ease (the words' write-in). */
const WRITE = Easing.bezierFn(0.33, 1, 0.68, 1);

const clamp01 = (x: number) => {
	"worklet";
	return Math.min(1, Math.max(0, x));
};

const smoothstep = (a: number, b: number, x: number) => {
	"worklet";
	const u = clamp01((x - a) / (b - a));
	return u * u * (3 - 2 * u);
};

/** The faces a gleam writes in: a display title, or the mirror's Newsreader italic. */
export type GleamFace = "font-display" | "font-mirror";

type Props = {
	/** Each row is a line of its own (the board's `<br>`); words wrap inside a row. */
	rows: readonly string[];
	clock: SharedValue<number>;
	/** When word 0 starts, and the gap between words. */
	at: number;
	step: number;
	size: number;
	line: number;
	tracking: number;
	reduced: boolean;
	face: GleamFace;
	/** The space after each word, in em. */
	gap: number;
};

/**
 * The gleam's words (board `glA`), the core GleamTitle and GleamLine share:
 * each word on the caller's clock (ms), opacity smoothstep(0, .6), a 7 pt rise,
 * a soft copy standing in for the blur, a gleam ≤ .3. Reduce Motion: each word
 * fades over 200 ms. Rows only: the caller wraps them for VoiceOver.
 */
export function GleamWords({
	rows,
	clock,
	at,
	step,
	size,
	line,
	tracking,
	reduced,
	face,
	gap,
}: Props) {
	const ink = useTokenColor("foreground");
	const glow = useTokenColor("write-gleam");
	const style = {
		fontSize: size,
		letterSpacing: tracking,
		lineHeight: line,
	} as const;
	// Keyed by position: a user's own line can repeat a word.
	return gleamRows(rows, at, step).map((words, r) => (
		<View className="flex-row flex-wrap justify-center" key={r}>
			{words.map((w, j) => (
				<Word
					clock={clock}
					face={face}
					gap={w.last ? 0 : size * gap}
					glow={glow}
					ink={ink}
					key={j}
					reduced={reduced}
					start={w.start}
					style={style}
					text={w.text}
				/>
			))}
		</View>
	));
}

type WordProps = {
	text: string;
	face: GleamFace;
	start: number;
	gap: number;
	clock: SharedValue<number>;
	reduced: boolean;
	ink: string;
	glow: string;
	style: { fontSize: number; lineHeight: number; letterSpacing: number };
};

function Word({
	text,
	face,
	start,
	gap,
	clock,
	reduced,
	ink,
	glow,
	style,
}: WordProps) {
	const base = useAnimatedStyle(() => {
		if (reduced) {
			return {
				opacity: clamp01((clock.get() - start) / REDUCED_FADE_MS),
				transform: [{ translateY: 0 }],
			};
		}
		const p = (clock.get() - start) / WORD_MS;
		return {
			opacity: p <= 0 ? 0 : smoothstep(0, 0.6, p),
			transform: [{ translateY: RISE * (1 - WRITE(clamp01(p))) }],
		};
	});
	const soft = useAnimatedStyle(() => {
		const p = (clock.get() - start) / WORD_MS;
		return {
			opacity: reduced || p <= 0 ? 0 : 1 - WRITE(clamp01(p / 0.8)),
		};
	});
	const gleam = useAnimatedStyle(() => {
		const p = (clock.get() - start) / WORD_MS;
		const off = reduced || p <= 0 || p >= 1.2;
		return {
			opacity: off
				? 0
				: GLEAM.max * Math.exp(-(((p - GLEAM.at) / GLEAM.width) ** 2)),
		};
	});
	const copy = (shadow: string, r: number, inkAlpha?: number) => (
		<AppText
			className={face}
			style={[
				style,
				{
					textShadowColor: shadow,
					textShadowOffset: NO_OFFSET,
					textShadowRadius: r,
				},
				inkAlpha === undefined ? null : { opacity: inkAlpha },
			]}
			variant="greeting"
		>
			{text}
		</AppText>
	);
	return (
		<Animated.View style={[{ marginRight: gap }, base]}>
			<AppText className={face} style={style} variant="greeting">
				{text}
			</AppText>
			<Animated.View className="absolute inset-0" style={soft}>
				{copy(ink, SOFT_R, SOFT_INK)}
			</Animated.View>
			<Animated.View className="absolute inset-0" style={gleam}>
				{copy(glow, GLEAM.r)}
			</Animated.View>
		</Animated.View>
	);
}
