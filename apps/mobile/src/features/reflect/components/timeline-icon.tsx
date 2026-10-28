import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { Pressable, StyleSheet, View } from "react-native";
import { playSoftPress } from "@/lib/haptics";

const TIMELINE_ICON_NAME = { android: "history", ios: "clock" } as const;

export const TimelineIcon = () => {
	const router = useRouter();
	const foregroundColor = useThemeColor("foreground");

	const handlePress = () => {
		playSoftPress();
		router.push("/(protected)/timeline");
	};

	return (
		<Pressable
			accessibilityLabel="Open your timeline"
			accessibilityRole="button"
			hitSlop={8}
			onPress={handlePress}
		>
			<View className="h-10 w-10 items-center justify-center rounded-full border border-accent">
				<SymbolView
					name={TIMELINE_ICON_NAME}
					size={20}
					style={styles.icon}
					tintColor={foregroundColor}
				/>
			</View>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	icon: { opacity: 0.5 },
});
