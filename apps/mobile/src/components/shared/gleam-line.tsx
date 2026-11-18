import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { GleamWords } from "@/components/shared/gleam-words";

/** Board `.tb`: the gap after each word, in em. */
const WORD_GAP = 0.24;

type Props = {
	/** The line; its words wrap. */
	text: string;
	clock: SharedValue<number>;
	/** When word 0 starts, and the gap between words. */
	at: number;
	step: number;
	size: number;
	line: number;
	tracking: number;
	reduced: boolean;
};

/**
 * A line in the mirror's voice (Newsreader italic) that writes itself in,
 * word by word (gleam-line-intro, board `glA`), on the caller's clock (ms):
 * Sit with this's lines. Not a heading: VoiceOver reads it as text.
 */
export function GleamLine({ text, ...words }: Props) {
	return (
		<View accessibilityLabel={text} accessible>
			<GleamWords {...words} face="font-mirror" gap={WORD_GAP} rows={[text]} />
		</View>
	);
}
