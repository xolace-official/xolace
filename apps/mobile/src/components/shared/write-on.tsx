import MaskedViewBase, {
	type MaskedViewProps,
} from "@react-native-masked-view/masked-view";
import { type ComponentType, useState } from "react";
import {
	type AccessibilityActionEvent,
	type AccessibilityActionInfo,
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
	/** A clamp (You're not alone's 7 lines, a safety net); the mask clamps with it. */
	numberOfLines?: number;
	/** The lines the quote set in, as `onTextLayout` reports them (to tell a clamped quote). */
	onLines?: (lines: TextLayoutEvent["nativeEvent"]["lines"]) => void;
	/** VoiceOver's custom actions on the quote (You're not alone: Report, Hide this). */
	accessibilityActions?: AccessibilityActionInfo[];
	onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
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
	numberOfLines,
	onLines,
	accessibilityActions,
	onAccessibilityAction,
}: Props) {
	const ink = useTokenColor("foreground");
	const glow = useTokenColor("write-gleam");
	const [lines, setLines] = useState<Line[]>([]);
	const [written, setWritten] = useState(reduced);
	const quote = `“${text}”`;

	const onLayout = (e: TextLayoutEvent) => {
		const all = e.nativeEvent.lines;
		onLines?.(all);
		// A clamped iOS text reports only the clamp's lines (the rest folded into the
		// last); slicing anyway keeps the write to the lines shown, whatever a
		// platform reports.
		const ls = numberOfLines ? all.slice(0, numberOfLines) : all;
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
				numberOfLines={numberOfLines}
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
				accessibilityActions={accessibilityActions}
				accessibilityLabel={quote}
				accessible
				className={written ? "text-foreground" : "text-transparent"}
				numberOfLines={numberOfLines}
				onAccessibilityAction={onAccessibilityAction}
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
