import { View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";

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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: `${foregroundColor}08`,
    borderWidth: 1,
    borderColor: `${foregroundColor}10`,
  };

  const iconName = { ios: ios as any, android: android as any };
  const labelStyle = { color: `${foregroundColor}40`, fontSize: 10 };

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityLabel={`Share via ${label}`}
      hitSlop={8}
    >
      <View className="items-center gap-2">
        <GlassView style={glassStyle} glassEffectStyle="clear">
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
