import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { RadioGroup } from "heroui-native";
import { EaseView } from "react-native-ease/uniwind";
import { cn } from "@/src/lib/utils";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { RadioIconIndicator } from "@/src/features/settings/components/radio-icon-indicator";
import type { CrossPlatformSymbol } from "@/src/features/settings/components/settings-icons";
import { ThemeCarousel } from "@/src/features/settings/components/theme-carousel";
import { ProfileCardsSection } from "@/src/features/settings/components/profile-cards-section";
import { ConfirmationDialog } from "@/src/components/shared/confirmation-dialog";
import { useAppearanceSettings, type ThemeMode } from "@/src/features/settings/hooks/use-appearance-settings";
import type { MotionPreference } from "@/src/lib/motion/use-effective-reduced-motion";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { useAppStore } from "@/src/store/store";
import { Presets } from "react-native-pulsar";

const MODE_OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  symbol: CrossPlatformSymbol;
}[] = [
  {
    value: "system",
    label: "System",
    description: "Follows your device's appearance setting",
    symbol: { ios: "gearshape", android: "settings", web: "settings" },
  },
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme",
    symbol: { ios: "sun.max", android: "light_mode", web: "light_mode" },
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme",
    symbol: { ios: "moon", android: "dark_mode", web: "dark_mode" },
  },
];

const MOTION_OPTIONS: {
  value: MotionPreference;
  label: string;
  description: string;
  symbol: CrossPlatformSymbol;
}[] = [
  {
    value: "system",
    label: "Match my phone",
    description: "Follows your device's Reduce Motion setting",
    symbol: { ios: "iphone", android: "smartphone", web: "smartphone" },
  },
  {
    value: "reduced",
    label: "Reduced motion",
    description: "Stills breathing and other fluid motion, even if your phone doesn't ask for it",
    symbol: { ios: "tortoise", android: "slow_motion_video", web: "slow_motion_video" },
  },
  {
    value: "full",
    label: "Full motion",
    description: "Keeps everything animated, even if your phone asks apps to calm down",
    symbol: { ios: "sparkles", android: "animation", web: "animation" },
  },
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

/**
 * Sonar is a 2s sweep: three 0.35-amplitude pings 600ms apart, then a 0.855 burst
 * at 1.66s. CoreHaptics renders its sharpness (frequency) channel, so even the quiet
 * pings read as crisp on iOS. Android has no frequency channel below API 36, so
 * Pulsar falls back to VibrationEffect.createWaveform() with sharpness dropped —
 * 0.35 amplitude sits under most LRAs' perceptual floor, and the one beat you might
 * feel lands 1.66s after the tap. Result: it reads as "nothing happened".
 * Strike (80ms, 0.72 amplitude) survives the amplitude-only path and fires at once.
 */
const playThemeSelect = Platform.OS === "android" ? Presets.strike : Presets.sonar;

const styles = StyleSheet.create({
  contentContainer: { paddingTop: 16, paddingBottom: 48 },
});

export const AppearanceScreen = () => {
  const {
    storedTheme,
    setThemeMode,
    colorThemeId,
    setColorTheme,
    motionPreference,
    setMotionPreference,
    osReduceMotion,
    effectiveReducedMotion,
    nightModeEnabled,
    setNightModeEnabled,
  } = useAppearanceSettings();

  // Contextual line under the motion picker — spells out what the current
  // choice actually does, and specifically warns when fluid motion (the
  // breathing at "sit with this") will stop following.
  const motionHint = effectiveReducedMotion
    ? "Fluid motion is calmed — the breathing exercise won't expand and contract; it guides you with words and a steady haptic instead."
    : motionPreference === "full" && osReduceMotion
      ? "Your phone asks apps to reduce motion, but Xolace will stay fully animated."
      : "Everything stays gently in motion, including the breathing exercise.";

  const setIntroSeen = useAppStore((s) => s.setIntroSeen);
  const [replayIntroOpen, setReplayIntroOpen] = useState(false);
  const { isPlus } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);

  const handleFreeThemePress = (themeId: string) => {
    playThemeSelect();
    setColorTheme(themeId);
  };

  const handlePremiumThemePress = (themeId: string, available: boolean) => {
    if (!isPlus) {
      openPaywall("premium_theme");
      return;
    }
    if (!available) return; // Plus, but this theme's CSS hasn't shipped yet
    playThemeSelect();
    setColorTheme(themeId);
  };

  // No haptic here — SettingsRow's toggle variant now plays one, and firing
  // both stacked two vibrations on a single flip.
  const handleNightModeToggle = (v: boolean) => {
    setNightModeEnabled(v);
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* ── MODE ─────────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, easing: EASE }}
          className="mb-8"
        >
          <SettingsSection title="Mode">
            <View className="px-5 gap-2">
              <RadioGroup
                value={storedTheme ?? "system"}
                onValueChange={(v) => setThemeMode(v as ThemeMode)}
                className="gap-2"
              >
                {MODE_OPTIONS.map((opt) => (
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

        {/* ── THEMES ──────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, delay: 60, easing: EASE }}
          className="mb-8"
        >
          <AppText className="text-xs font-semibold tracking-widest text-accent uppercase px-5 pb-3">
            App Themes
          </AppText>
          <ThemeCarousel
            activeThemeId={colorThemeId}
            isPlus={isPlus}
            reducedMotion={effectiveReducedMotion}
            onFreeThemePress={handleFreeThemePress}
            onPremiumThemePress={handlePremiumThemePress}
          />
        </EaseView>

        {/* ── MOTION ───────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 120, easing: EASE }}
          className="mb-8"
        >
          <SettingsSection title="Motion">
            <View className="px-5 gap-2">
              <RadioGroup
                value={motionPreference}
                onValueChange={(v) => setMotionPreference(v as MotionPreference)}
                className="gap-2"
              >
                {MOTION_OPTIONS.map((opt) => (
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
              <View className="flex-row items-start gap-2 mt-1 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
                <AppText className="flex-1 text-sm leading-5 text-foreground/60">
                  {motionHint}
                </AppText>
              </View>
            </View>
          </SettingsSection>
        </EaseView>

        {/* ── VISUAL ───────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 160, easing: EASE }}
          className="mx-5 rounded-2xl bg-surface overflow-hidden mb-8"
        >
          <SettingsRow
            variant="toggle"
            label="Night mode (10pm–4am)"
            isSelected={nightModeEnabled}
            onToggle={handleNightModeToggle}
          />
          <View className="px-5 pb-4">
            <AppText className="text-xs text-foreground/30 leading-5">
              Shifts the theme and words to match the rawer emotional register of
              late-night sessions.
            </AppText>
          </View>
        </EaseView>

        <ProfileCardsSection />

        {/* ── GENERAL ──────────────────────────────────────────── */}
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 200, easing: EASE }}
        >
          <SettingsSection title="General">
            <SettingsRow
              variant="chevron"
              label="Replay intro"
              onPress={() => setReplayIntroOpen(true)}
              isLast
            />
          </SettingsSection>
        </EaseView>
      </ScrollView>

      <ConfirmationDialog
        isOpen={replayIntroOpen}
        onOpenChange={setReplayIntroOpen}
        title="Replay intro?"
        description="You'll be taken back to the opening screens."
        confirmLabel="Replay"
        onConfirm={() => {
          setReplayIntroOpen(false);
          setIntroSeen(false);
        }}
      />
    </>
  );
};
