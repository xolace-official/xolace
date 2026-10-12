import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useLargeHeaderOptions } from "@/src/lib/navigation-options";

/**
 * Settings stack layout with a large transparent header and a back button.
 */
const BACK_ICON_NAME = { ios: "chevron.left", android: "arrow_back", web: "arrow_back" } as const;
const SETTINGS_OPTIONS = { title: "Settings" };
const APPEARANCE_OPTIONS = { title: "Appearance" };
const MIRROR_OPTIONS = { title: "Mirror" };
const NOTIFICATIONS_OPTIONS = { title: "Notifications" };
const DATA_OPTIONS = { title: "Privacy & Data" };
const ACCOUNT_OPTIONS = { title: "Account" };
const FOLLOW_OPTIONS = { title: "Follow & Support" };

export default function SettingsLayout() {
  const router = useRouter();
  const largeHeaderOptions = useLargeHeaderOptions();
  const tintColor = useThemeColor("foreground") as string;

  const renderBackButton = () => (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <SymbolView
        name={BACK_ICON_NAME}
        size={20}
        tintColor={tintColor}
      />
    </Pressable>
  );

  const screenOptions = {
    ...largeHeaderOptions,
    headerLeft: renderBackButton,
  };

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={SETTINGS_OPTIONS} />
      <Stack.Screen name="appearance" options={APPEARANCE_OPTIONS} />
      <Stack.Screen name="mirror" options={MIRROR_OPTIONS} />
      <Stack.Screen name="notifications" options={NOTIFICATIONS_OPTIONS} />
      <Stack.Screen name="data" options={DATA_OPTIONS} />
      <Stack.Screen name="account" options={ACCOUNT_OPTIONS} />
      <Stack.Screen name="follow" options={FOLLOW_OPTIONS} />
    </Stack>
  );
}
