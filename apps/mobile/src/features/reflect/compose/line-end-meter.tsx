import { useRef } from "react";
import { AppText } from "@/components/shared/app-text";
import {
	type Line,
	lineEnd,
	type Writing,
} from "@/features/reflect/compose/compose-face-gaze";
import { a11yHidden } from "@/lib/utils";

type Props = {
	text: string;
	onWriting: (writing: Writing) => void;
};

/**
 * An invisible copy of the composer's text, laid out like the field, so the face knows where
 * the last line really ends and when it really wraps. Fills the field's box.
 */
export const LineEndMeter = ({ text, onWriting }: Props) => {
	const box = useRef<{ height: number; width: number } | null>(null);
	const last = useRef<Line | undefined>(undefined);
	const laidOut = useRef(false);

	// Text and box layouts arrive in either order; report once both are known.
	const report = () => {
		if (box.current && laidOut.current) {
			onWriting({ text, ...lineEnd(last.current, box.current) });
		}
	};

	return (
		<AppText
			// Matches the field's `pt-4 text-lg`, so the lines wrap where its lines do.
			className="absolute inset-0 pt-4 text-lg opacity-0"
			onLayout={(e) => {
				const { height, width } = e.nativeEvent.layout;
				box.current = { height, width };
				report();
			}}
			onTextLayout={(e) => {
				last.current = e.nativeEvent.lines.at(-1);
				laidOut.current = true;
				report();
			}}
			pointerEvents="none"
			{...a11yHidden(true)}
		>
			{/* An empty Text reports no lines; a space keeps one so "nothing yet" still lands. */}
			{text.length > 0 ? text : " "}
		</AppText>
	);
};
