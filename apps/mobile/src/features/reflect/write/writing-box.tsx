import { type RefObject, useEffect, useRef, useState } from "react";
import { TextInput, type TextInputInstance, View } from "react-native";
import { RotatingPlaceholder } from "@/components/shared/rotating-placeholder";
import { BODY_MAX_SCALE } from "@/design/type";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import { MAX_CHARS } from "../reflect-model";
import type { Writing } from "./compose-face-gaze";
import { FIELD_TEXT } from "./field-type";
import { LineEndMeter } from "./line-end-meter";
import { useTakeDrop } from "./use-take-drop";
import { WarmText, type Warmth } from "./warm-text";

/** The field takes focus once the zoom has settled, so the keyboard never fights it. */
const FOCUS_AFTER_MS = 440;
/** A word is finished when a space or punctuation follows it (board `onType`). */
const ENDS_WORD = /[\s.,!?]$/;
const FIELD_STYLE = [
	FIELD_TEXT,
	{ minHeight: LAYOUT.write.box, textAlignVertical: "top" as const },
];

type Props = {
	/** The placeholder rotates (Reflect is live and the box is empty). */
	running: boolean;
	reduced: boolean;
	onWriting: (w: Writing) => void;
	inputRef: RefObject<TextInputInstance | null>;
};

/**
 * The writing box (board `.wbox`): a transparent TextInput under the words you see. It grows
 * with the text inside the page's KeyboardAwareScrollView, so the caret stays above the bar.
 */
export function WritingBox({ running, reduced, onWriting, inputRef }: Props) {
	const { state, actions } = useReflect();
	const { text, late, listening, takeN, prompt, take } = state;
	const drop = useTakeDrop(text, listening, takeN, !take.scribe);
	const [warm, setWarm] = useState<Warmth | null>(null);
	const stamp = useRef(0);

	// A home sheet over Write would sit behind the keyboard: the field gives the
	// keyboard up while it's open and takes focus again once it resolves.
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
				className="type-compose p-0 font-normal text-transparent"
				maxFontSizeMultiplier={BODY_MAX_SCALE}
				maxLength={MAX_CHARS}
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
