import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { GleamWords } from "@/components/shared/gleam-words";

/** Board `.tw`: the gap after each word, in em. */
const WORD_GAP = 0.22;

type Props = {
	/** Each row is a line of its own (the board's `<br>`); words wrap inside a row. */
	rows: readonly string[];
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
 * A title that writes itself in, word by word (board `.tw` `glA`), on the
 * caller's clock (ms): After a session's moments, and You're not alone's
 * titles (the words: `gleam-words.tsx`). One header for VoiceOver; Dynamic
 * Type caps at 1.25×.
 */
export function GleamTitle({ rows, ...words }: Props) {
	return (
		<View
			accessibilityLabel={rows.join(" ")}
			accessibilityRole="header"
			accessible
		>
			<GleamWords {...words} face="font-display" gap={WORD_GAP} rows={rows} />
		</View>
	);
}
