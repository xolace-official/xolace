import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";

type Props = {
	iosIcon: string;
	androidIcon: string;
	label: string;
	foregroundColor: string;
	onPress: () => void;
};

export function QuickAction({
	iosIcon,
	androidIcon,
	label,
	foregroundColor,
	onPress,
}: Props) {
	const glassStyle = {
		alignItems: "center" as const,
		backgroundColor: `${foregroundColor}08`,
		borderRadius: 16,
		height: 56,
		justifyContent: "center" as const,
		width: 56,
	};

	const iconName = { android: androidIcon as any, ios: iosIcon as any };
	const labelStyle = { color: `${foregroundColor}50` };

	return (
		<PressableFeedback accessibilityLabel={label} hitSlop={8} onPress={onPress}>
			<View className="items-center gap-2">
				<GlassView glassEffectStyle="clear" style={glassStyle}>
					<SymbolView
						name={iconName}
						size={22}
						tintColor={`${foregroundColor}70`}
					/>
				</GlassView>
				<AppText className="text-xs" style={labelStyle}>
					{label}
				</AppText>
			</View>
		</PressableFeedback>
	);
}
