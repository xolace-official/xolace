import { View } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";

const HELP_ICON_NAME = { ios: "lifepreserver", android: "sos", web: "sos" } as const;

type Props = { onPress: () => void };

export const HelpHeaderButton = ({ onPress }: Props) => {
  const warningColor = useThemeColor("warning") as string;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityLabel="Open crisis resources"
      hitSlop={12}
    >
      <View className="flex-row items-center gap-1.5 px-3 py-1.5 mr-1">
        <SymbolView name={HELP_ICON_NAME} size={14} tintColor={warningColor} />
        <AppText className="text-xs text-warning">Help</AppText>
      </View>
    </PressableFeedback>
  );
};
