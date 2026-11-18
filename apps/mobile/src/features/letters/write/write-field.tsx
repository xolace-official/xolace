import type { ComponentRef, Ref } from "react";
import { TextInput } from "react-native";
import { useFixedFaces } from "@/design/fonts";
import { FONTS } from "@/design/type";
import { LETTER_MAX, LETTERS } from "../copy";
import {
	LETTER_MAX_SCALE,
	LETTER_TYPE,
	PAPER_RADIUS,
	SHEET,
	useLetterInk,
} from "../letter-paper";
import { useWriteScreen } from "./write-data";

/**
 * The letter's field: the write sheet itself, in the letter's type and ink. It scrolls inside the
 * sheet, so the paper never grows past 330 pt; the count says what's missing or left.
 */
export function WriteField({
	ref,
	hint,
	focus,
}: {
	ref: Ref<ComponentRef<typeof TextInput>>;
	hint: string;
	focus: boolean;
}) {
	const { state, actions } = useWriteScreen();
	const ink = useLetterInk();
	const ready = useFixedFaces("letter");
	return (
		<TextInput
			accessibilityHint={hint || undefined}
			accessibilityLabel={LETTERS.write.field}
			autoFocus={focus}
			cursorColor={ink.ink}
			maxFontSizeMultiplier={LETTER_MAX_SCALE}
			maxLength={LETTER_MAX}
			multiline
			onChangeText={actions.setText}
			placeholder={LETTERS.write.placeholder}
			placeholderTextColor={ink.inkFaint}
			ref={ref}
			scrollEnabled
			selectionColor={ink.ink}
			style={{
				...LETTER_TYPE.write,
				backgroundColor: ink.paper,
				borderRadius: PAPER_RADIUS,
				boxShadow: ink.shadow,
				color: ink.ink,
				fontFamily: ready ? FONTS.letter : undefined,
				height: SHEET.write.height,
				paddingBottom: SHEET.write.padV,
				paddingHorizontal: SHEET.write.padH,
				paddingTop: SHEET.write.padV,
			}}
			textAlignVertical="top"
			value={state.text}
		/>
	);
}
