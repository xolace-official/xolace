import MaskedViewBase, {
	type MaskedViewProps,
} from "@react-native-masked-view/masked-view";
import { type ComponentType, useState } from "react";
import {
	type StyleProp,
	StyleSheet,
	type TextLayoutEvent,
	type TextStyle,
	View,
} from "react-native";
import { type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import {
	type Line,
	WRITE_ON,
	WriteStrips,
	writeEnd,
} from "@/components/shared/write-strips";
import { useTokenColor } from "@/lib/use-token-color";

const OPAQUE = "black";
/** masked-view 0.3.2's class typings predate React 19's JSX types. */
const MaskedView = MaskedViewBase as unknown as ComponentType<MaskedViewProps>;

type Props = {
	text: string;
	/** ms since this quote started writing (< 0: not yet). */
	write: SharedValue<number>;
	/** How many lines the quote set in (the caption waits for the last). */
	lineCount: SharedValue<number>;
	/** How far across its widest line the last line reaches. */
	lastFrac: SharedValue<number>;
	reduced: boolean;
	/** The quote's face and size (Peers and After: Newsreader italic 19.5/27). */
	style: StyleProp<TextStyle>;
};

/**
 * A quote writes itself in, line by line (You're not alone's cards, After a
 * session's share card): the text is the
 * mask, and under it one ink strip per line slides its soft head left to right
 * (420 ms at an even rate; lines 260 ms apart). A warm strip under the text's
 * shadow peaks mid-sweep. The quote itself is the one text VoiceOver reads and
 * Dynamic Type sizes; it's clear until written, then the masks go.
 */
export function WriteOn({
	text,
	write,
	lineCount,
	lastFrac,
	reduced,
	style,
}: Props) {
	const ink = useTokenColor("foreground");
	const glow = useTokenColor("write-gleam");
	const [lines, setLines] = useState<Line[]>([]);
	const [written, setWritten] = useState(reduced);
	const quote = `“${text}”`;

	const onLayout = (e: TextLayoutEvent) => {
		const ls = e.nativeEvent.lines;
		if (ls.length === 0) {
			return;
		}
		setLines(
			ls.map((l) => ({ height: l.height, width: l.width, x: l.x, y: l.y }))
		);
		lineCount.set(ls.length);
		const widest = Math.max(...ls.map((l) => l.width));
		lastFrac.set(widest > 0 ? ls.at(-1)!.width / widest : 1);
	};

	useAnimatedReaction(
		() => lineCount.get() > 0 && write.get() >= writeEnd(lineCount.get()),
		(done, was) => {
			if (done && !was) {
				scheduleOnRN(setWritten, true);
			}
		}
	);

	// The mask leaves the view tree (it becomes the masked view's `maskView`), so it
	// carries its own hidden flag: VoiceOver reads the one quote below, not the mask.
	const mask = (shadow: boolean) => (
		<View
			accessibilityElementsHidden
			className="absolute inset-0"
			importantForAccessibility="no-hide-descendants"
		>
			<AppText
				accessible={false}
				style={[
					style,
					{ color: OPAQUE },
					shadow
						? { textShadowColor: OPAQUE, textShadowRadius: WRITE_ON.glow.r }
						: null,
				]}
				variant="body"
			>
				{quote}
			</AppText>
		</View>
	);

	return (
		<View>
			<AppText
				accessibilityLabel={quote}
				accessible
				className={written ? "text-foreground" : "text-transparent"}
				onTextLayout={onLayout}
				style={style}
				variant="body"
			>
				{quote}
			</AppText>
			{written ? null : (
				<View
					accessibilityElementsHidden
					className="absolute inset-0"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
				>
					<MaskedView maskElement={mask(true)} style={StyleSheet.absoluteFill}>
						<WriteStrips color={glow} glow lines={lines} write={write} />
					</MaskedView>
					<MaskedView maskElement={mask(false)} style={StyleSheet.absoluteFill}>
						<WriteStrips color={ink} lines={lines} write={write} />
					</MaskedView>
				</View>
			)}
		</View>
	);
}
