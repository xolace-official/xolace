import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useFixedFaces } from "@/design/fonts";
import { FONTS } from "@/design/type";
import { cn } from "@/lib/cn";
import {
	LETTER_MAX_SCALE,
	LETTER_TYPE,
	type LetterSize,
	PAPER_CLASS,
	PAPER_RADIUS,
	SHEET,
	useLetterInk,
} from "./letter-paper";

/** Space between a letter's paragraphs. */
const PARAGRAPH_GAP = 8;

type SheetProps = {
	/** `write`: 330 pt, 18/27. `read`: 420 pt at least, 17/26. */
	size: "write" | "read";
	/** A letter to show, paragraphs split on "\n". Or pass children (the write screen's field). */
	text?: string;
	children?: ReactNode;
	style?: StyleProp<ViewStyle>;
};

/**
 * The letter sheet: plain cream paper, 5 pt corners, one soft warm shadow, no lines. It fills
 * the width with a 24 pt margin each side (342 pt on the board's phone). The reader's grows with
 * its words, so large text never runs past the paper.
 */
export function LetterSheet({ size, text, children, style }: SheetProps) {
	const ink = useLetterInk();
	const s = SHEET[size];
	return (
		<View
			className={PAPER_CLASS[ink.light].paper}
			style={[
				{
					borderRadius: PAPER_RADIUS,
					boxShadow: ink.shadow,
					gap: PARAGRAPH_GAP,
					marginHorizontal: SHEET.margin,
					minHeight: s.height,
					paddingHorizontal: s.padH,
					paddingVertical: s.padV,
				},
				style,
			]}
		>
			{text == null ? children : <LetterText size={size} text={text} />}
		</View>
	);
}

/** A letter's words in the letter's own type, one line of text per paragraph. */
function LetterText({
	size,
	text,
	className,
	numberOfLines,
}: {
	size: LetterSize;
	text: string;
	className?: string;
	numberOfLines?: number;
}) {
	return text.split("\n").map((para, i) => (
		<LetterLine
			className={className}
			// Paragraphs are positional: the text never reorders under them.
			key={i}
			numberOfLines={numberOfLines}
			size={size}
			text={para}
		/>
	));
}

/**
 * One run of the letter's type: upright Newsreader in the letter's ink. The face loads where
 * it's drawn; until it's in, the words keep their place unseen rather than swap faces.
 */
export function LetterLine({
	size,
	text,
	className,
	numberOfLines,
}: {
	size: LetterSize;
	text: string;
	className?: string;
	numberOfLines?: number;
}) {
	const ready = useFixedFaces("letter");
	return (
		<AppText
			className={cn("text-letter-ink", className)}
			maxFontSizeMultiplier={LETTER_MAX_SCALE}
			numberOfLines={numberOfLines}
			style={{
				...LETTER_TYPE[size],
				fontFamily: FONTS.letter,
				opacity: ready ? 1 : 0,
			}}
			variant="body"
		>
			{text}
		</AppText>
	);
}
