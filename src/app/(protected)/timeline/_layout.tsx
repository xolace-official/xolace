import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useLargeHeaderOptions } from "@/src/lib/navigation-options";

/**
 * Layout component that provides the Timeline screen container with a configured Stack navigator and header controls.
 *
 * The layout applies large-header options and renders a left back control and a right settings control in the header.
 *
 * @returns The layout's JSX element rendering the configured Stack and its child screen.
 */
const BACK_ICON_NAME = { ios: "chevron.left", android: "arrow_back", web: "arrow_back" } as const;
const SETTINGS_ICON_NAME = { ios: "gearshape", android: "settings", web: "settings" } as const;
const TIMELINE_OPTIONS = { title: "Your Timeline" };

export default function TimelineLayout() {
  const router = useRouter();
  const largeHeaderOptions = useLargeHeaderOptions();
  const tintColor = useThemeColor("foreground") as string;

  const renderBackButton = () => (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <SymbolView name={BACK_ICON_NAME} size={20} tintColor={tintColor} />
    </Pressable>
  );

  const renderSettingsButton = () => (
    <Pressable onPress={() => router.push("/settings")} hitSlop={8}>
      <SymbolView name={SETTINGS_ICON_NAME} size={20} tintColor={tintColor} />
    </Pressable>
  );

  const screenOptions = {
    ...largeHeaderOptions,
    headerLeft: renderBackButton,
    headerRight: renderSettingsButton,
  };

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={TIMELINE_OPTIONS} />
    </Stack>
  );
}
