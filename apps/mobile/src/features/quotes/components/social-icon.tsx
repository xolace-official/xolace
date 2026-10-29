import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";

type Props = {
	label: string;
	ios: string;
	android: string;
	foregroundColor: string;
	onPress: () => void;
};

export function SocialIcon({
	label,
	ios,
	android,
	foregroundColor,
	onPress,
}: Props) {
	const glassStyle = {
		alignItems: "center" as const,
		backgroundColor: `${foregroundColor}08`,
		borderColor: `${foregroundColor}10`,
		borderRadius: 24,
		borderWidth: 1,
		height: 48,
		justifyContent: "center" as const,
		width: 48,
	};

	const iconName = { android: android as any, ios: ios as any };
	const labelStyle = { color: `${foregroundColor}40`, fontSize: 10 };

	return (
		<PressableFeedback
			accessibilityLabel={`Share via ${label}`}
			hitSlop={8}
			onPress={onPress}
		>
			<View className="items-center gap-2">
				<GlassView glassEffectStyle="clear" style={glassStyle}>
					<SymbolView
						name={iconName}
						size={18}
						tintColor={`${foregroundColor}50`}
					/>
				</GlassView>
				<AppText style={labelStyle}>{label}</AppText>
			</View>
		</PressableFeedback>
	);
}
