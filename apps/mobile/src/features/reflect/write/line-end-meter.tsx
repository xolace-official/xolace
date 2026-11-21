import { useRef } from "react";
import { AppText } from "@/components/shared/app-text";
import { a11yHidden } from "@/lib/utils";
import { type Line, lineEnd, type Writing } from "./compose-face-gaze";
import { FIELD_TEXT } from "./field-type";

type Props = {
	text: string;
	onWriting: (writing: Writing) => void;
};

export function LineEndMeter({ text, onWriting }: Props) {
	const box = useRef<{ height: number; width: number } | null>(null);
	const last = useRef<Line | undefined>(undefined);
	const laidOut = useRef(false);

	const report = () => {
		if (box.current && laidOut.current) {
			onWriting({ text, ...lineEnd(last.current, box.current) });
		}
	};

	return (
		<AppText
			className="absolute inset-0 opacity-0"
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
			style={FIELD_TEXT}
			variant="compose"
			{...a11yHidden(true)}
		>
			{/* An empty Text reports no lines; a space keeps one so "nothing yet" still lands. */}
			{text.length > 0 ? text : " "}
		</AppText>
	);
}
