// The frame every intake step sits in. A plain `View` with insets by hand, not
// `SafeAreaView`: that component ignores a Uniwind `className`, so `flex-1` never lands.
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The held frame for a step whose content has not loaded. Not a skeleton on purpose. */
export function IntakeBlank() {
	return <View className="flex-1 bg-background" />;
}

export function IntakeScreen({ children }: { children: ReactNode }) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingBottom: Math.max(insets.bottom, 12),
				paddingTop: insets.top,
			}}
		>
			{children}
		</View>
	);
}
