import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { GleamWords } from "@/components/shared/gleam-words";

const WORD_GAP = 0.24;

type Props = {
	text: string;
	clock: SharedValue<number>;
	at: number;
	step: number;
	size: number;
	line: number;
	tracking: number;
	reduced: boolean;
};

export function GleamLine({ text, ...words }: Props) {
	return (
		<View accessibilityLabel={text} accessible>
			<GleamWords {...words} face="font-mirror" gap={WORD_GAP} rows={[text]} />
		</View>
	);
}
