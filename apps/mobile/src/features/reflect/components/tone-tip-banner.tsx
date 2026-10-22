import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { usePostHog } from "posthog-react-native";
import { AppText } from "@/src/components/shared/app-text";
import {
  MirrorTonePickerDialog,
  type MirrorTone,
} from "@/src/features/settings/components/mirror-tone-picker-dialog";
import { useSettings } from "@/src/features/settings/hooks/use-settings";
import { useAppStore } from "@/src/store/store";

const CLOSE_ICON = { ios: "xmark", android: "close", web: "close" } as const;

export const ToneTipBanner = () => {
  const { toneTipSeen, setToneTipSeen } = useAppStore();
  const { mirrorTone, setMirrorTone } = useSettings();
  const posthog = usePostHog();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null);
  const foregroundColor = useThemeColor("foreground");

  useEffect(() => {
    if (!toneTipSeen) {
      posthog.capture("tone_tip_shown");
    }
  }, [toneTipSeen, posthog]);

  useEffect(() => {
    if (!confirmedLabel) return;
    const t = setTimeout(() => setToneTipSeen(true), 3000);
    return () => clearTimeout(t);
  }, [confirmedLabel, setToneTipSeen]);

  if (toneTipSeen) return null;

  const handleDismiss = () => {
    posthog.capture("tone_tip_dismissed");
    setToneTipSeen(true);
  };

  const handleToneSelect = (tone: MirrorTone) => {
    posthog.capture("tone_tip_tone_selected", { tone });
    setMirrorTone(tone);
    setPickerOpen(false);
    setConfirmedLabel(tone.charAt(0).toUpperCase() + tone.slice(1));
  };

  return (
    <>
      <View className="flex-row items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
        {confirmedLabel ? (
          <AppText className="flex-1 text-sm leading-5 text-foreground/60">
            Your next reflection will use {confirmedLabel} tone.
          </AppText>
        ) : (
          <>
            <AppText className="flex-1 text-sm leading-5 text-foreground/60">
              You can change how the mirror reflects. Explore different tones.
            </AppText>
            <View className="flex-row items-center gap-3 pt-0.5">
              <PressableFeedback
                onPress={() => setPickerOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Adjust tone"
              >
                <AppText className="text-sm font-medium text-accent">
                  Adjust tone
                </AppText>
              </PressableFeedback>
              <PressableFeedback
                onPress={handleDismiss}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Dismiss tip"
              >
                <SymbolView
                  name={CLOSE_ICON}
                  size={14}
                  tintColor={foregroundColor}
                  style={styles.closeIcon}
                />
              </PressableFeedback>
            </View>
          </>
        )}
      </View>
      <MirrorTonePickerDialog
        isOpen={pickerOpen}
        onOpenChange={setPickerOpen}
        currentTone={mirrorTone}
        onSelect={handleToneSelect}
      />
    </>
  );
};

const styles = StyleSheet.create({
  closeIcon: { opacity: 0.4 },
});
