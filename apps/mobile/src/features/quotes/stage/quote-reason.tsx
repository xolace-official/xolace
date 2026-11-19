import { Pressable, type StyleProp, type TextStyle } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { Reason } from "../quotes-model";

/** The line under the quote. A free account's "Yours is waiting →" opens Xolace+. */
export function QuoteReason({
	reason,
	style,
	onGate,
}: {
	reason: Reason;
	style: StyleProp<TextStyle>;
	onGate: () => void;
}) {
	const text = (
		<AppText
			center
			className={reason.gate ? "text-[13.5px] underline" : "text-[13.5px]"}
			style={style}
			variant="footnote"
			weight="medium"
		>
			{reason.text}
		</AppText>
	);
	if (!reason.gate) {
		return text;
	}
	return (
		<Pressable accessibilityRole="link" hitSlop={8} onPress={onGate}>
			{text}
		</Pressable>
	);
}
