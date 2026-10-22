import { ScrollView, StyleSheet, View } from "react-native";
import { RadioGroup, useToast, useThemeColor  } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { cn } from "@/src/lib/utils";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { RadioIconIndicator } from "@/src/features/settings/components/radio-icon-indicator";
import { ConfirmationDialog } from "@/src/components/shared/confirmation-dialog";
import { useDataSettings, type RetentionOption } from "@/src/features/settings/hooks/use-data-settings";
import { useConfirmAction } from "@/src/features/settings/hooks/use-confirm-action";
import {
  SHARE_ICON,
  MEMORY_ICON,
  DELETE_DATA_ICON,
  DELETE_ACCOUNT_ICON,
  type CrossPlatformSymbol,
} from "@/src/features/settings/components/settings-icons";

const RETENTION_OPTIONS: {
  value: RetentionOption;
  label: string;
  description: string;
  symbol: CrossPlatformSymbol;
}[] = [
  {
    value: "indefinite",
    label: "Indefinite",
    description: "Keep my data until I delete it",
    symbol: { ios: "infinity", android: "all_inclusive", web: "all_inclusive" },
  },
  {
    value: "1_year",
    label: "1 year",
    description: "Auto-delete sessions older than 1 year",
    symbol: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
  },
  {
    value: "6_months",
    label: "6 months",
    description: "Auto-delete sessions older than 6 months",
    symbol: { ios: "calendar.badge.clock", android: "event_repeat", web: "event_repeat" },
  },
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
  contentContainer: { paddingTop: 20, paddingBottom: 48 },
});

export const DataScreen = () => {
  const { toast } = useToast();
  const {
    contributeAnonymously,
    setContributeAnonymously,
    personalMemory,
    setPersonalMemory,
    retention,
    setRetention,
    performDeleteData,
    performDeleteAccount,
  } = useDataSettings();

  const mutedColor = useThemeColor("muted") as string;

  const settingIcon = (icon: React.ComponentProps<typeof SymbolView>["name"]) => (
    <SymbolView name={icon} size={17} tintColor={mutedColor} />
  );

  const { setConfirmAction, isConfirmLoading, activeConfig, handleConfirm } =
    useConfirmAction({
      performLogout: async () => {},
      performDeleteData,
      performDeleteAccount,
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
        {/* ── SHARING ──────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, easing: EASE }}
        >
          <SettingsSection title="Sharing">
            <SettingsRow
              variant="toggle"
              icon={settingIcon(SHARE_ICON)}
              label="Share by default"
              isSelected={contributeAnonymously}
              onToggle={setContributeAnonymously}
              isLast
            />
          </SettingsSection>
        </EaseView>

        {/* ── MEMORY ───────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 30, easing: EASE }}
        >
          <SettingsSection title="Memory">
            <SettingsRow
              variant="toggle"
              icon={settingIcon(MEMORY_ICON)}
              label="Personal memory"
              isSelected={personalMemory}
              onToggle={setPersonalMemory}
              isLast
            />
            <AppText className="px-5 pt-2 text-sm text-foreground/55">
              The fire remembers what you&apos;ve shared with it, that&apos;s
              how it knows you. Turn this off and new reflections are kept
              without their words.
            </AppText>
          </SettingsSection>
        </EaseView>

        {/* ── RETENTION ────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 60, easing: EASE }}
        >
          <SettingsSection title="Retention">
            <View className="px-5">
              <RadioGroup
                value={retention}
                onValueChange={(v) => setRetention(v as RetentionOption)}
                className="gap-2"
              >
                {RETENTION_OPTIONS.map((opt) => (
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

        {/* ── DANGER ZONE ──────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 120, easing: EASE }}
        >
          <SettingsSection title="Danger zone">
            <SettingsRow
              variant="chevron"
              icon={settingIcon(DELETE_DATA_ICON)}
              label="Delete all my data"
              danger
              onPress={() => setConfirmAction("deleteData")}
            />
            <SettingsRow
              variant="chevron"
              icon={settingIcon(DELETE_ACCOUNT_ICON)}
              label="Delete account"
              danger
              onPress={() => setConfirmAction("deleteAccount")}
              isLast
            />
          </SettingsSection>
        </EaseView>
      </ScrollView>

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
