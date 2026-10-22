import { View, ScrollView, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { useThemeColor, useToast } from "heroui-native";
import { EaseView } from "react-native-ease/uniwind";
import { useState } from "react";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { NameDialog } from "@/src/features/settings/components/name-dialog";
import { ConfirmationDialog } from "@/src/components/shared/confirmation-dialog";
import { DevToolsSection } from "@/src/features/settings/components/dev-tools-section";
import { useAccountSettings } from "@/src/features/settings/hooks/use-account-settings";
import { useConfirmAction } from "@/src/features/settings/hooks/use-confirm-action";
import { AppleIcon } from "@/src/features/auth/components/apple-icon";
import { GoogleIcon } from "@/src/features/auth/components/google-icon";
import { validateSpaceName } from "@/convex/lib/spaceName";
import { COMPANION_FALLBACK_NAME } from "@/src/features/talk/talk-copy";
import { validateDisplayName } from "@/convex/lib/displayName";
import {
  ACCOUNT_ICON,
  DISPLAY_NAME_ICON,
  SPACE_NAME_ICON,
  LOG_OUT_ICON,
  EMAIL_ICON,
} from "@/src/features/settings/components/settings-icons";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
  contentContainer: { paddingTop: 20, paddingBottom: 48 },
});

export const AccountScreen = () => {
  const { toast } = useToast();
  const { signInMethod, spaceName, setSpaceName, displayName, setDisplayName, performLogout } =
    useAccountSettings();
  const [spaceNameOpen, setSpaceNameOpen] = useState(false);
  const [displayNameOpen, setDisplayNameOpen] = useState(false);

  const iconColor = useThemeColor("foreground") as string;
  const mutedColor = useThemeColor("muted") as string;

  const settingIcon = (icon: React.ComponentProps<typeof SymbolView>["name"]) => (
    <SymbolView name={icon} size={17} tintColor={mutedColor} />
  );

  const signInProvider = signInMethod.toLowerCase();
  const signInValueIcon = signInProvider.includes("apple") ? (
    <AppleIcon size={16} color={iconColor} />
  ) : signInProvider.includes("google") ? (
    <GoogleIcon size={16} />
  ) : (
    <SymbolView name={EMAIL_ICON} size={15} tintColor={mutedColor} />
  );

  const { setConfirmAction, isConfirmLoading, activeConfig, handleConfirm } =
    useConfirmAction({
      performLogout,
      performDeleteData: async () => {},
      performDeleteAccount: async () => {},
      toast,
    });

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* ── SIGN-IN ──────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, easing: EASE }}
        >
          <SettingsSection title="Sign-in">
            <SettingsRow
              variant="value"
              icon={settingIcon(ACCOUNT_ICON)}
              label="Sign-in method"
              value={signInMethod}
              valueIcon={signInValueIcon}
              isLast
            />
          </SettingsSection>
        </EaseView>

        {/* ── USERNAME ─────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 30, easing: EASE }}
        >
          <SettingsSection title="Username">
            <SettingsRow
              variant="value"
              icon={settingIcon(DISPLAY_NAME_ICON)}
              label="Username"
              value={displayName ?? "—"}
              onPress={() => setDisplayNameOpen(true)}
              isLast
            />
          </SettingsSection>
        </EaseView>

        {/* ── YOUR SPACE ───────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 60, easing: EASE }}
        >
          <SettingsSection title="Your space">
            <SettingsRow
              variant="value"
              icon={settingIcon(SPACE_NAME_ICON)}
              label="Name"
              value={spaceName ?? "—"}
              onPress={() => setSpaceNameOpen(true)}
              isLast
            />
          </SettingsSection>
        </EaseView>

        {/* ── DEV TOOLS (dev builds only) ──────────────────────── */}
        {__DEV__ && <DevToolsSection />}

        {/* ── LOG OUT ──────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 120, easing: EASE }}
        >
          <View className="px-5">
            <SettingsRow
              variant="action"
              icon={settingIcon(LOG_OUT_ICON)}
              label="Log out"
              danger
              onPress={() => setConfirmAction("logout")}
              isLast
            />
          </View>
        </EaseView>
      </ScrollView>

      <NameDialog
        isOpen={spaceNameOpen}
        title="Your space"
        description={`A soft label, just for you. It's also the name of your talk companion, ${COMPANION_FALLBACK_NAME} until you name it.`}
        placeholder="e.g. ember, haven, mine"
        validate={validateSpaceName}
        currentName={spaceName}
        onOpenChange={setSpaceNameOpen}
        onSave={async (name) => { await setSpaceName(name); }}
        onClear={async () => { await setSpaceName(null); }}
        clearLabel={`Reset to ${COMPANION_FALLBACK_NAME}`}
      />

      <NameDialog
        isOpen={displayNameOpen}
        title="Username"
        description="What Xolace calls you."
        placeholder="e.g. Wren"
        fieldLabel="Username"
        validate={validateDisplayName}
        currentName={displayName}
        autoCapitalize="words"
        onOpenChange={setDisplayNameOpen}
        onSave={setDisplayName}
      />

      <ConfirmationDialog
        isOpen={activeConfig !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={activeConfig?.title ?? ""}
        description={activeConfig?.description ?? ""}
        confirmLabel={activeConfig?.confirmLabel ?? ""}
        onConfirm={handleConfirm}
        isDestructive={activeConfig?.isDestructive}
        isLoading={isConfirmLoading}
      />
    </>
  );
};
