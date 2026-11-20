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

const DIM_TO = 0.7;
const SLICES = 3;
const PAD = 12;
const GLEAM_R = 10;

type Line = { x: number; y: number; width: number; height: number };

type Props = {
	text: string;
	c2: SharedValue<number>;
	cs: SharedValue<number>;
	lineCount: SharedValue<number>;
	lastFrac: SharedValue<number>;
	gleam: string;
	reduced: boolean;
};

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
