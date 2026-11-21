import MaskedView from "@react-native-masked-view/masked-view";
import { useState } from "react";
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

type Props = {
	text: string;
	write: SharedValue<number>;
	lineCount: SharedValue<number>;
	lastFrac: SharedValue<number>;
	reduced: boolean;
	style: StyleProp<TextStyle>;
	numberOfLines?: number;
	onLines?: (lines: TextLayoutEvent["nativeEvent"]["lines"]) => void;
	accessibilityActions?: AccessibilityActionInfo[];
	onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
};

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
