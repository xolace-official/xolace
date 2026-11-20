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

const PARAGRAPH_GAP = 8;

type SheetProps = {
	size: "write" | "read";
	text?: string;
	children?: ReactNode;
	style?: StyleProp<ViewStyle>;
};

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
	return text
		.split("\n")
		.map((para, i) => (
			<LetterLine
				className={className}
				key={i}
				numberOfLines={numberOfLines}
				size={size}
				text={para}
			/>
		));
}

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
