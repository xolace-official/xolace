import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { GleamWords } from "@/components/shared/gleam-words";

const WORD_GAP = 0.22;

type Props = {
	rows: readonly string[];
	clock: SharedValue<number>;
	at: number;
	step: number;
	size: number;
	line: number;
	tracking: number;
	reduced: boolean;
};

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
