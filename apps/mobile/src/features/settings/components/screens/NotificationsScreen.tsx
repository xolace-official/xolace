import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { RadioGroup, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { cn } from "@/src/lib/utils";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { HourRadioGroup } from "@/src/features/settings/components/hour-radio-group";
import { RadioIconIndicator } from "@/src/features/settings/components/radio-icon-indicator";
import {
  useNotificationSettings,
  type NotificationReach,
} from "@/src/features/settings/hooks/use-notification-settings";
import {
  CHAT_NOTIFICATIONS_ICON,
  NOTIFICATIONS_ICON,
  QUIET_HOURS_ICON,
  type CrossPlatformSymbol,
} from "@/src/features/settings/components/settings-icons";
import { ConfirmationDialog } from "@/src/components/shared/confirmation-dialog";

const REACH_OPTIONS: {
  value: NotificationReach;
  label: string;
  description: string;
  symbol: CrossPlatformSymbol;
}[] = [
  {
    value: "warm",
    label: "Warm",
    description: "Gentle recognition, like a friend who notices without demanding",
    symbol: { ios: "heart", android: "favorite", web: "favorite" },
  },
  {
    value: "direct",
    label: "Direct",
    description: "Honest and pattern-aware, gets to the point",
    symbol: { ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" },
  },
  {
    value: "quiet",
    label: "Quiet",
    description: "Minimal presence, often just a word or two",
    symbol: { ios: "speaker.wave.1", android: "volume_down", web: "volume_down" },
  },
];

const BEFORE_OPTIONS = [
  { label: "5 am", value: 5 },
  { label: "6 am", value: 6 },
  { label: "7 am", value: 7 },
  { label: "8 am", value: 8 },
  { label: "9 am", value: 9 },
  { label: "10 am", value: 10 },
];

const AFTER_OPTIONS = [
  { label: "7 pm", value: 19 },
  { label: "8 pm", value: 20 },
  { label: "9 pm", value: 21 },
  { label: "10 pm", value: 22 },
  { label: "11 pm", value: 23 },
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
  contentContainer: { paddingTop: 20, paddingBottom: 48 },
});

export const NotificationsScreen = () => {
  const {
    gentleReminders,
    setGentleReminders,
    chatNotifications,
    setChatNotifications,
    permissionBlocked,
    dismissPermissionBlocked,
    reach,
    setReach,
    quietWindow,
    setQuietWindow,
  } = useNotificationSettings();

  const mutedColor = useThemeColor("muted") as string;

  const settingIcon = (icon: React.ComponentProps<typeof SymbolView>["name"]) => (
    <SymbolView name={icon} size={17} tintColor={mutedColor} />
  );

  const handleQuietToggle = (enabled: boolean) => {
    if (enabled) {
      setQuietWindow({ dontReachBefore: 8, dontReachAfter: 21 });
    } else {
      setQuietWindow(null);
    }
  };

  const handleBeforeChange = (hour: number) => {
    setQuietWindow({
      dontReachBefore: hour,
      dontReachAfter: quietWindow?.dontReachAfter ?? 21,
    });
  };

  const handleAfterChange = (hour: number) => {
    setQuietWindow({
      dontReachBefore: quietWindow?.dontReachBefore ?? 8,
      dontReachAfter: hour,
    });
  };

  const openDeviceSettings = () => {
    dismissPermissionBlocked();
    Linking.openSettings();
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* ── REMINDERS ───────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, easing: EASE }}
        >
          <SettingsSection title="Reminders">
            <SettingsRow
              variant="toggle"
              icon={settingIcon(NOTIFICATIONS_ICON)}
              label="Gentle reminders"
              isSelected={gentleReminders}
              onToggle={setGentleReminders}
              isLast
            />
          </SettingsSection>
        </EaseView>

        {/* ── HOW I REACH OUT ─────────────────────────────────────── */}
        {gentleReminders && (
          <>
            <EaseView
              initialAnimate={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 280, delay: 60, easing: EASE }}
            >
              <SettingsSection title="How I reach out">
                <View className="px-5">
                  <RadioGroup
                    value={reach}
                    onValueChange={(v) => setReach(v as NotificationReach)}
                    className="gap-2"
                  >
                    {REACH_OPTIONS.map((opt) => (
                      <RadioGroup.Item key={opt.value} value={opt.value}>
                        {({ isSelected }) => (
                          <View
                            className={cn(
                              "flex-row items-center gap-4 px-4 py-4 rounded-2xl",
                              isSelected ? "bg-surface" : "bg-surface/30",
                            )}
                          >
                            <RadioIconIndicator
                              symbol={opt.symbol}
                              isSelected={isSelected}
                            />
                            <View className="flex-1 gap-0.5">
                              <AppText className="text-base font-medium text-foreground">
                                {opt.label}
                              </AppText>
                              <AppText className="text-sm text-foreground/55">
                                {opt.description}
                              </AppText>
                            </View>
                          </View>
                        )}
                      </RadioGroup.Item>
                    ))}
                  </RadioGroup>
                </View>
              </SettingsSection>
            </EaseView>

            {/* ── QUIET HOURS ───────────────────────────────────────── */}
            <EaseView
              initialAnimate={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 280, delay: 120, easing: EASE }}
            >
              <SettingsSection title="Quiet hours">
                <SettingsRow
                  variant="toggle"
                  icon={settingIcon(QUIET_HOURS_ICON)}
                  label="Enable quiet hours"
                  isSelected={!!quietWindow}
                  onToggle={handleQuietToggle}
                  isLast={!quietWindow}
                />

                {quietWindow && (
                  <>
                    <HourRadioGroup
                      label="Not before"
                      value={quietWindow.dontReachBefore}
                      options={BEFORE_OPTIONS}
                      onChange={handleBeforeChange}
                    />
                    <HourRadioGroup
                      label="Not after"
                      value={quietWindow.dontReachAfter}
                      options={AFTER_OPTIONS}
                      onChange={handleAfterChange}
                      className="pb-4"
                    />
                  </>
                )}
              </SettingsSection>
            </EaseView>
          </>
        )}
        {/* ── CONVERSATIONS ───────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: "timing",
            duration: 280,
            delay: gentleReminders ? 180 : 60,
            easing: EASE,
          }}
        >
          <SettingsSection title="Conversations">
            <SettingsRow
              variant="toggle"
              icon={settingIcon(CHAT_NOTIFICATIONS_ICON)}
              label="Chat notifications"
              isSelected={chatNotifications}
              onToggle={setChatNotifications}
              isLast
            />
            <AppText className="px-5 pt-3 text-sm text-foreground/55">
              When someone asks to talk, answers your request, or writes while
              you&apos;re away. Never what was written.
            </AppText>
          </SettingsSection>
        </EaseView>
      </ScrollView>

      {/*
        The one state a toggle cannot resolve itself: the OS has stopped
        asking. Flipping the switch here would promise delivery the device
        won't make, so it stays put and this points at the only route back.
      */}
      <ConfirmationDialog
        isOpen={permissionBlocked}
        onOpenChange={(open) => {
          if (!open) dismissPermissionBlocked();
        }}
        title="Notifications are off for Xolace"
        description="Your device is blocking notifications, so this can't be turned on from here. You can allow them in device settings."
        confirmLabel="Open Settings"
        onConfirm={openDeviceSettings}
      />
    </>
  );
};
