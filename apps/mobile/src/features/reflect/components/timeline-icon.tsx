import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { playSoftPress } from "@/src/lib/haptics";

const TIMELINE_ICON_NAME = { ios: "clock", android: "history" } as const;

export const TimelineIcon = () => {
  const router = useRouter();
  const foregroundColor = useThemeColor("foreground");

  const handlePress = () => {
    playSoftPress();
    router.push("/(protected)/timeline");
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open your timeline"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full border border-accent">
        <SymbolView
          name={TIMELINE_ICON_NAME}
          size={20}
          tintColor={foregroundColor}
          style={styles.icon}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  icon: { opacity: 0.5 },
});
