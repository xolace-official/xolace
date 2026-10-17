import { StyleSheet, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/expo";
import { UpdateRow, useVersionLabel } from "@/src/features/settings/components/update-row";
import { api } from "@/convex/_generated/api";
import { useAppStore } from "@/src/store/store";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { AppText } from "@/src/components/shared/app-text";
import {
  type CrossPlatformSymbol,
  APPEARANCE_ICON,
  MIRROR_ICON,
  NOTIFICATIONS_ICON,
  SHIELD_ICON,
  ACCOUNT_ICON,
  HEART_ICON,
  PLUS_TIER_ICON,
} from "@/src/features/settings/components/settings-icons";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";

const styles = StyleSheet.create({
  contentContainer: { paddingTop: 20, paddingBottom: 48 },
});

export const SettingsScreen = () => {
  const router = useRouter();
  const mutedColor = useThemeColor("muted") as string;

  const preferences = useQuery(api.preferences.get);
  const { user } = useUser();
  const { isPlus } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);
  const storedTheme = useAppStore((s) => s.theme);

  const themeDisplay =
    storedTheme === "system" ? "System" : storedTheme === "light" ? "Light" : "Dark";

  const mirrorToneDisplay = preferences
    ? preferences.mirrorTone.charAt(0).toUpperCase() + preferences.mirrorTone.slice(1)
    : "—";

  const notificationsDisplay = preferences
    ? preferences.notifications?.enabled
      ? "On"
      : "Off"
    : "—";

  const signInMethod = (() => {
    if (!user) return "—";
    const ext = user.externalAccounts?.[0];
    if (!ext) return "Email";
    const provider = (ext.provider ?? "").toLowerCase();
    if (provider.includes("apple")) return "Apple";
    if (provider.includes("google")) return "Google";
    return "Email";
  })();

  const versionLabel = useVersionLabel();

  const icon = (name: CrossPlatformSymbol) => (
    <SymbolView name={name} size={17} tintColor={mutedColor} />
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ── XOLACE+ ─────────────────────────────────────────── */}
      <SettingsSection title="Xolace+">
        {isPlus ? (
          <SettingsRow
            variant="value"
            icon={icon(PLUS_TIER_ICON)}
            label="Xolace+"
            value="Active"
            isLast
          />
        ) : (
          <SettingsRow
            variant="nav"
            icon={icon(PLUS_TIER_ICON)}
            label="Xolace+"
            onPress={() => openPaywall("settings_row")}
            isLast
          />
        )}
      </SettingsSection>

      {/* ── PREFERENCES ─────────────────────────────────────── */}
      <SettingsSection title="Preferences">
        <SettingsRow
          variant="nav"
          icon={icon(APPEARANCE_ICON)}
          label="Appearance"
          value={themeDisplay}
          onPress={() => router.push("/(protected)/settings/appearance")}
        />
        <SettingsRow
          variant="nav"
          icon={icon(MIRROR_ICON)}
          label="Mirror"
          value={mirrorToneDisplay}
          onPress={() => router.push("/(protected)/settings/mirror")}
        />
        <SettingsRow
          variant="nav"
          icon={icon(NOTIFICATIONS_ICON)}
          label="Notifications"
          value={notificationsDisplay}
          onPress={() => router.push("/(protected)/settings/notifications")}
          isLast
        />
      </SettingsSection>

      {/* ── PERSONAL ────────────────────────────────────────── */}
      <SettingsSection title="Personal">
        <SettingsRow
          variant="nav"
          icon={icon(SHIELD_ICON)}
          label="Privacy & Data"
          onPress={() => router.push("/(protected)/settings/data")}
        />
        <SettingsRow
          variant="nav"
          icon={icon(ACCOUNT_ICON)}
          label="Account"
          value={signInMethod}
          onPress={() => router.push("/(protected)/settings/account")}
        />
        <SettingsRow
          variant="nav"
          icon={icon(HEART_ICON)}
          label="Follow & Support"
          onPress={() => router.push("/(protected)/settings/follow")}
        />
        <UpdateRow isLast />
      </SettingsSection>

      {/* ── VERSION FOOTER ──────────────────────────────────── */}
      <View className="items-center pt-8 gap-1">
        <AppText className="text-sm font-semibold tracking-widest text-foreground/20" selectable>
          Xolace
        </AppText>
        <AppText className="text-xs text-foreground/20" selectable>
          {versionLabel}
        </AppText>
      </View>
    </ScrollView>
  );
};
