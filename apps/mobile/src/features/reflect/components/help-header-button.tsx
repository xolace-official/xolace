import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";

const HELP_ICON_NAME = {
	android: "sos",
	ios: "lifepreserver",
	web: "sos",
} as const;

type Props = { onPress: () => void };

export const HelpHeaderButton = ({ onPress }: Props) => {
	const warningColor = useThemeColor("warning") as string;

	return (
		<PressableFeedback
			accessibilityLabel="Open crisis resources"
			hitSlop={12}
			onPress={onPress}
		>
			<View className="mr-1 flex-row items-center gap-1.5 px-3 py-1.5">
				<SymbolView name={HELP_ICON_NAME} size={14} tintColor={warningColor} />
				<AppText className="text-warning text-xs">Help</AppText>
			</View>
		</PressableFeedback>
	);
};
