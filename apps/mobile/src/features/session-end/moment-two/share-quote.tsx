import { useState } from "react";
import { type TextLayoutEvent, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { WriteOn } from "@/components/shared/write-on";
import { EASE, T2, TS } from "../session-look";
import { clamp01 } from "../timeline";
import { QUOTE } from "./quote-style";

/** `.landed .q`: ink → ink 2. On both themes ink 2 sits about 30% of the way from ink to the card. */
const DIM_TO = 0.7;
/** Each line gleams in thirds, left to right, so the glow travels across as the board's words do. */
const SLICES = 3;
/** Room around a slice for the glow (r 10). */
const PAD = 12;
/** `gl2`'s glow radius. */
const GLEAM_R = 10;

type Line = { x: number; y: number; width: number; height: number };

type Props = {
	text: string;
	/** ms into moment 2, and since the send (< 0 before). */
	c2: SharedValue<number>;
	cs: SharedValue<number>;
	/** The quote's lines and its last line's reach, for the caption's timing. */
	lineCount: SharedValue<number>;
	lastFrac: SharedValue<number>;
	/** The words' warm glow as they leave. */
	gleam: string;
	reduced: boolean;
};

/**
 * The quote (board `.q`): Peers' write-on (`write-on.tsx`), starting 820 ms into moment 2 with the
 * same timing (`wordsOf`: 160 in, lines 260 apart, a 420 ms sweep). When it's sent the words gleam once,
 * line by line (`gl2`: a warm text glow peaking at 40% of .55 s), and once your star lands the quote
 * turns ink 2 (.8 s after .3 s), here as a fade toward the card. VoiceOver reads the one quote.
 */
export function ShareQuote({
	text,
	c2,
	cs,
	lineCount,
	lastFrac,
	gleam,
	reduced,
}: Props) {
	const [lines, setLines] = useState<Line[]>([]);
	const [fullW, setFullW] = useState(0);
	const write = useDerivedValue(() =>
		c2.get() < 0 ? -1 : c2.get() - T2.write.at
	);
	const quote = `“${text}”`;
	const onLayout = (e: TextLayoutEvent) =>
		setLines(
			e.nativeEvent.lines.map((l) => ({
				height: l.height,
				width: l.width,
				x: l.x,
				y: l.y,
			}))
		);
	const widest = Math.max(1, ...lines.map((l) => l.width));

	const dim = useAnimatedStyle(() => {
		const land = reduced ? TS.reducedLand : TS.land;
		const u =
			cs.get() < 0 ? 0 : clamp01((cs.get() - land - TS.dim.after) / TS.dim.ms);
		return { opacity: 1 - (1 - DIM_TO) * EASE.css(u) };
	});

	return (
		<View>
			<Animated.View style={dim}>
				<WriteOn
					lastFrac={lastFrac}
					lineCount={lineCount}
					reduced={reduced}
					style={QUOTE}
					text={text}
					write={write}
				/>
			</Animated.View>
			{reduced ? null : (
				<View
					accessibilityElementsHidden
					className="absolute inset-0"
					importantForAccessibility="no-hide-descendants"
					onLayout={(e) => setFullW(e.nativeEvent.layout.width)}
					pointerEvents="none"
				>
					<AppText
						accessible={false}
						className="text-transparent"
						onTextLayout={onLayout}
						style={QUOTE}
						variant="body"
					>
						{quote}
					</AppText>
					{lines.flatMap((l, i) =>
						Array.from({ length: SLICES }, (_, k) => (
							<GleamSlice
								cs={cs}
								fullW={fullW}
								glow={gleam}
								index={i}
								key={`${i}-${k}`}
								line={l}
								quote={quote}
								slice={k}
								widest={widest}
							/>
						))
					)}
				</View>
			)}
		</View>
	);
}

type SliceProps = {
	index: number;
	slice: number;
	line: Line;
	widest: number;
	fullW: number;
	quote: string;
	cs: SharedValue<number>;
	glow: string;
};

/**
 * A third of one line's words, gleaming once (`gl2`) at its own delay: `g` = line · 120 + column · 9,
 * the column being the slice's middle (36 columns across the widest line, as `wordsOf` counts).
 */
function GleamSlice({
	index,
	slice,
	line,
	widest,
	fullW,
	quote,
	cs,
	glow,
}: SliceProps) {
	const w = line.width / SLICES;
	const left = line.x + w * slice;
	const col = (((slice + 0.5) * w) / widest) * T2.write.cpl;
	const style = useAnimatedStyle(() => {
		const at = index * TS.gleam.line + col * TS.gleam.col;
		const u = cs.get() < 0 ? 0 : (cs.get() - at) / TS.gleam.ms;
		if (u <= 0 || u >= 1) {
			return { opacity: 0 };
		}
		const k = TS.gleam.peak;
		return {
			opacity: u < k ? EASE.css(u / k) : 1 - EASE.css((u - k) / (1 - k)),
		};
	});
	return (
		<Animated.View
			className="absolute overflow-hidden"
			style={[
				{
					height: line.height + PAD * 2,
					left: left - (slice === 0 ? PAD : 0),
					top: line.y - PAD,
					width: w + (slice === 0 || slice === SLICES - 1 ? PAD : 0),
				},
				style,
			]}
		>
			<AppText
				accessible={false}
				className="absolute text-foreground"
				style={[
					QUOTE,
					{
						left: -(left - (slice === 0 ? PAD : 0)),
						textShadowColor: glow,
						textShadowOffset: { height: 0, width: 0 },
						textShadowRadius: GLEAM_R,
						top: PAD - line.y,
						width: fullW,
					},
				]}
				variant="body"
			>
				{quote}
			</AppText>
		</Animated.View>
	);
}
