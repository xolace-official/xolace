import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useTokenColor } from "@/lib/use-token-color";
import { EASE, REDUCED_MS } from "../session-look";
import { clamp01 } from "../timeline";

/** Board `glA`: .7 s a word; the gleam ≤ .3 at 42%, the 5 px blur as a soft copy. */
const WORD_MS = 700;
const GLEAM = { at: 0.42, max: 0.3, r: 8, width: 0.2 } as const;
const SOFT_R = 5;
const SOFT_INK = 0.25;
/** iOS draws a text shadow only with an offset set. */
const NO_OFFSET = { height: 0, width: 0 } as const;
const RISE = 7;
const WORD_GAP = 0.22;

const smoothstep = (a: number, b: number, x: number) => {
	"worklet";
	const u = clamp01((x - a) / (b - a));
	return u * u * (3 - 2 * u);
};

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
};

/**
 * A title that writes itself in, word by word (board `.tw` `glA`, Peers' and
 * Sit's gleam words) on this screen's clock: opacity smoothstep(0, .6), a 7 pt
 * rise, a soft copy standing in for the blur, a gleam ≤ .3. Reduce Motion: each
 * word fades over 200 ms. One header for VoiceOver; Dynamic Type caps at 1.25×.
 */
export function GleamTitle({
	rows,
	clock,
	at,
	step,
	size,
	line,
	tracking,
	reduced,
}: Props) {
	const ink = useTokenColor("foreground");
	const glow = useTokenColor("after-write-gleam");
	const style = {
		fontSize: size,
		letterSpacing: tracking,
		lineHeight: line,
	} as const;
	let i = 0;
	return (
		<View
			accessibilityLabel={rows.join(" ")}
			accessibilityRole="header"
			accessible
		>
			{rows.map((row) => (
				<View className="flex-row flex-wrap justify-center" key={row}>
					{row.split(" ").map((w, j, all) => {
						const start = at + i * step;
						i += 1;
						return (
							<Word
								clock={clock}
								gap={j === all.length - 1 ? 0 : size * WORD_GAP}
								glow={glow}
								ink={ink}
								key={`${row}-${w}`}
								reduced={reduced}
								start={start}
								style={style}
								text={w}
							/>
						);
					})}
				</View>
			))}
		</View>
	);
}

type WordProps = {
	text: string;
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
				opacity: clamp01((clock.get() - start) / REDUCED_MS),
				transform: [{ translateY: 0 }],
			};
		}
		const p = (clock.get() - start) / WORD_MS;
		return {
			opacity: p <= 0 ? 0 : smoothstep(0, 0.6, p),
			transform: [{ translateY: RISE * (1 - EASE.write(clamp01(p))) }],
		};
	});
	const soft = useAnimatedStyle(() => {
		const p = (clock.get() - start) / WORD_MS;
		return {
			opacity: reduced || p <= 0 ? 0 : 1 - EASE.write(clamp01(p / 0.8)),
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
			className="font-display"
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
			<AppText className="font-display" style={style} variant="greeting">
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
