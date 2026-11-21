import { REFLECTION_INPUT_MAX_CHARS } from "@xolace/backend/shared";
import { type RefObject, useEffect, useRef, useState } from "react";
import { TextInput, type TextInputInstance, View } from "react-native";
import { RotatingPlaceholder } from "@/components/shared/rotating-placeholder";
import { BODY_MAX_SCALE } from "@/design/type";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import type { Writing } from "./compose-face-gaze";
import { FIELD_TEXT } from "./field-type";
import { LineEndMeter } from "./line-end-meter";
import { useTakeDrop } from "./use-take-drop";
import { WarmText, type Warmth } from "./warm-text";

const FOCUS_AFTER_MS = 440;
const ENDS_WORD = /[\s.,!?]$/;
// `includeFontPadding: false` (Android only) matches AppText, so the input's
// lines and caret sit exactly on WarmText's glyphs underneath.
const FIELD_STYLE = [
	FIELD_TEXT,
	{
		includeFontPadding: false,
		minHeight: LAYOUT.write.box,
		textAlignVertical: "top" as const,
	},
];

type Props = {
	running: boolean;
	reduced: boolean;
	onWriting: (w: Writing) => void;
	inputRef: RefObject<TextInputInstance | null>;
};

export function WritingBox({ running, reduced, onWriting, inputRef }: Props) {
	const { state, actions } = useReflect();
	const { text, late, listening, takeN, prompt, take } = state;
	const drop = useTakeDrop(text, listening, takeN, !take.scribe);
	const [warm, setWarm] = useState<Warmth | null>(null);
	const stamp = useRef(0);

	const { sheetOpen } = state;
	useEffect(() => {
		if (sheetOpen) {
			inputRef.current?.blur();
			return;
		}
		const id = setTimeout(() => inputRef.current?.focus(), FOCUS_AFTER_MS);
		return () => clearTimeout(id);
	}, [inputRef, sheetOpen]);

	const onChange = (next: string) => {
		if (
			next.length > text.length &&
			ENDS_WORD.test(next) &&
			!ENDS_WORD.test(text)
		) {
			stamp.current += 1;
			setWarm({
				stamp: stamp.current,
				word: next.trim().split(/\s+/).length - 1,
			});
		}
		drop.settle();
		actions.setText(next);
	};

	const placeholders = late
		? COPY.write.placeholders.late
		: COPY.write.placeholders.evening;

	return (
		<View style={{ minHeight: LAYOUT.write.box }}>
			{text.length === 0 ? (
				<View className="absolute inset-x-0 top-0" pointerEvents="none">
					<RotatingPlaceholder
						items={placeholders}
						reduced={reduced}
						running={running}
					/>
				</View>
			) : null}
			<LineEndMeter onWriting={onWriting} text={text} />
			<WarmText drop={drop} text={text} warm={warm} />
			<TextInput
				accessibilityHint={text ? undefined : placeholders[0]}
				accessibilityLabel={prompt}
				className="type-compose p-0 font-normal text-clear"
				maxFontSizeMultiplier={BODY_MAX_SCALE}
				maxLength={REFLECTION_INPUT_MAX_CHARS}
				multiline
				onChangeText={onChange}
				ref={inputRef}
				scrollEnabled={false}
				selectionColorClassName="accent-foreground"
				style={FIELD_STYLE}
				value={text}
			/>
		</View>
	);
}
