import { LETTER_MAX_CHARS } from "@xolace/backend/shared";
import type { ComponentRef, Ref } from "react";
import { TextInput } from "react-native";
import { useFixedFaces } from "@/design/fonts";
import { FONTS } from "@/design/type";
import { LETTERS } from "../copy";
import {
	LETTER_MAX_SCALE,
	LETTER_TYPE,
	PAPER_RADIUS,
	SHEET,
	useLetterInk,
} from "../letter-paper";
import { useWriteScreen } from "./write-data";

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
			maxLength={LETTER_MAX_CHARS}
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
