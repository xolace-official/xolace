import { Stack, useRouter } from "expo-router";
import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import { playSoftPress } from "@/src/lib/haptics";
import { useLargeHeaderOptions } from "@/src/lib/navigation-options";

/**
 * Settings stack layout with a large transparent header. Only the root gets a
 * custom back control (a nested stack root has no native one); inner screens
 * keep the native back button.
 */
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

  return (
    <Stack screenOptions={largeHeaderOptions}>
      <Stack.Screen name="index" options={SETTINGS_OPTIONS}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={process.env.EXPO_OS === "ios" ? "chevron.left" : ArrowBack}
            accessibilityLabel="Back"
            onPress={() => {
              playSoftPress();
              router.back();
            }}
          />
        </Stack.Toolbar>
      </Stack.Screen>
      <Stack.Screen name="appearance" options={APPEARANCE_OPTIONS} />
      <Stack.Screen name="mirror" options={MIRROR_OPTIONS} />
      <Stack.Screen name="notifications" options={NOTIFICATIONS_OPTIONS} />
      <Stack.Screen name="data" options={DATA_OPTIONS} />
      <Stack.Screen name="account" options={ACCOUNT_OPTIONS} />
      <Stack.Screen name="follow" options={FOLLOW_OPTIONS} />
    </Stack>
  );
}
