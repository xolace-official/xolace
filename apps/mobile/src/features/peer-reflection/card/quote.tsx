import { useState } from "react";
import type { TextLayoutEvent } from "react-native";
import Animated, {
	LinearTransition,
	type SharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { WriteOn } from "@/components/shared/write-on";
import { FONTS } from "@/design/type";
import { COPY } from "../copy";
import { LAYOUT } from "../peers-look";

const Q = LAYOUT.quote;
const QUOTE = {
	fontFamily: FONTS.mirror,
	fontSize: Q.size,
	lineHeight: Q.line,
} as const;
/** Production's expand: damping 18, stiffness 120. */
const EXPAND = LinearTransition.springify().damping(18).stiffness(120);
const ACTIONS = [
	{ label: COPY.actions.report, name: "report" },
	{ label: COPY.actions.hide, name: "hide" },
];

type Props = {
	text: string;
	/** ms since this card started writing (< 0: not yet). */
	write: SharedValue<number>;
	lineCount: SharedValue<number>;
	lastFrac: SharedValue<number>;
	reduced: boolean;
	onReport: () => void;
	onHide: () => void;
};

/**
 * The quote (board `.q`): full length, Newsreader italic 19.5/27, writing itself
 * in line by line (the shared write-on). A seven-line clamp with "Read more" is
 * only a safety net, told from the visible quote's own `onTextLayout`, with no
 * hidden copy. VoiceOver reads the quote as one element with Report and Hide.
 */
export function Quote({
	text,
	write,
	lineCount,
	lastFrac,
	reduced,
	onReport,
	onHide,
}: Props) {
	const [expanded, setExpanded] = useState(false);
	const [clipped, setClipped] = useState(false);
	// Set unclamped first: the quote's own `onTextLayout` says whether it runs past
	// seven lines (a clamped iOS text folds the rest into its last line, so a
	// clamped layout can't tell). Only then does it clamp, before its card rises.
	const onLines = (ls: TextLayoutEvent["nativeEvent"]["lines"]) => {
		if (!clipped && ls.length > Q.clamp) {
			setClipped(true);
		}
	};
	return (
		<Animated.View layout={EXPAND}>
			<WriteOn
				accessibilityActions={ACTIONS}
				lastFrac={lastFrac}
				lineCount={lineCount}
				numberOfLines={clipped && !expanded ? Q.clamp : undefined}
				onAccessibilityAction={(e) => {
					const { actionName } = e.nativeEvent;
					if (actionName === "report") {
						onReport();
					} else if (actionName === "hide") {
						onHide();
					}
				}}
				onLines={onLines}
				reduced={reduced}
				style={QUOTE}
				text={text}
				write={write}
			/>
			{clipped ? (
				<PressScale
					accessibilityRole="button"
					className="self-start"
					hitSlop={8}
					onPress={() => setExpanded((v) => !v)}
					style={{ marginTop: Q.moreTop }}
				>
					<AppText
						className="leading-[19px]"
						color="subtle"
						style={{ fontSize: Q.moreSize }}
						variant="footnote"
						weight="medium"
					>
						{expanded ? COPY.showLess : COPY.readMore}
					</AppText>
				</PressScale>
			) : null}
		</Animated.View>
	);
}
