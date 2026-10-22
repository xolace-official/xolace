import { useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";

export const PresenceDot = () => {
	const accentColor = useThemeColor("accent");
	const dotStyle = {
		...styles.base,
		shadowColor: accentColor,
	};

	return <View className="h-3 w-3 rounded-full bg-accent" style={dotStyle} />;
};

const styles = StyleSheet.create({
	base: {
		elevation: 4,
		shadowOffset: { height: 0, width: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 6,
	},
});
