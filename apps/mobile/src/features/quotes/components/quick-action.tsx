import { View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
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
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: `${foregroundColor}08`,
  };

  const iconName = { ios: iosIcon as any, android: androidIcon as any };
  const labelStyle = { color: `${foregroundColor}50` };

  return (
    <PressableFeedback onPress={onPress} accessibilityLabel={label} hitSlop={8}>
      <View className="items-center gap-2">
        <GlassView style={glassStyle} glassEffectStyle="clear">
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
