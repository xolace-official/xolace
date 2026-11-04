// A step with a text field and buttons under it. The whole column shrinks above the keyboard,
// so the buttons sit just over it and the field gives up height instead of sliding under them.
// (A sticky footer only translates: it ignored the screen's bottom inset, leaving a gap, and
// rode up over a tall or growing field.)
import type { ReactNode } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const FLEX_1 = { flex: 1 };

type Props = {
	/** The step's content; give the field `shrink` and a `min-h` so it can make room. */
	children: ReactNode;
	/** The buttons, kept directly above the keyboard. */
	footer: ReactNode;
};

export function KeyboardStep({ children, footer }: Props) {
	return (
		<KeyboardAvoidingView automaticOffset behavior="padding" style={FLEX_1}>
			<View className="flex-1 px-6 pt-6">{children}</View>
			<View className="gap-1 px-6 pt-3 pb-4">{footer}</View>
		</KeyboardAvoidingView>
	);
}
