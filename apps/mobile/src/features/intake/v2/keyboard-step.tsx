import type { ReactNode } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const FLEX_1 = { flex: 1 };

type Props = {
	children: ReactNode;
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
