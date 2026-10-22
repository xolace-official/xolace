import { View } from "react-native";
import { PressableFeedback, RadioGroup, Separator, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { RadioIconIndicator } from "@/src/features/settings/components/radio-icon-indicator";
import { useVoiceSettings } from "@/src/features/settings/hooks/use-voice-settings";
import { useVoicePreview } from "@/src/features/settings/hooks/use-voice-preview";
import { VOICE_OPTIONS, type VoiceValue } from "@/src/features/settings/voice-options";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/src/lib/haptics";
import { cn } from "@/src/lib/utils";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

/**
 * Plus-gated custom-voice picker. Mirrors the Tone section's RadioGroup, with
 * two additions: named voices are locked for free users (tap → paywall), and
 * each carries a play/stop preview that works even when locked.
 */
export const VoiceSection = () => {
  const { voice, setVoice } = useVoiceSettings();
  const { isPlus, isLoading: isPlusLoading } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);
  const preview = useVoicePreview();
  const accent = useThemeColor("accent");
  const muted = useThemeColor("muted");

  const handleValueChange = (value: string) => {
    const opt = VOICE_OPTIONS.find((o) => o.value === value);
    if (opt?.premium && !isPlus && !isPlusLoading) {
      openPaywall("mirror_voice");
      return;
    }
    if (opt?.premium && isPlusLoading) return;
    setVoice(value as VoiceValue);
  };

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300, delay: 80, easing: EASE }}
    >
      <SettingsSection title="Voice">
        <RadioGroup value={voice} onValueChange={handleValueChange}>
          {VOICE_OPTIONS.map((opt, index) => {
            const locked = opt.premium && !isPlus && !isPlusLoading;
            // null for "auto" (no preview); a VoiceSlug otherwise. A const so
            // the narrowing survives into the preview callback below.
            const slug = opt.value === "auto" ? null : opt.value;
            return (
              <View key={opt.value}>
                <RadioGroup.Item value={opt.value} className="px-5 py-4">
                  {({ isSelected }) => (
                    <>
                      <View className={cn("flex-1 gap-0.5 pr-3", locked && "opacity-40")}>
                        <AppText className="text-base font-medium text-foreground">
                          {opt.label}
                        </AppText>
                        <AppText className="text-sm text-foreground/55">
                          {opt.description}
                        </AppText>
                      </View>
                      {slug && (
                        <PressableFeedback
                          onPress={() => {
                            playSoftPress();
                            preview.toggle(slug);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={
                            preview.playingSlug === slug
                              ? `Stop ${opt.label} voice preview`
                              : `Play ${opt.label} voice preview`
                          }
                          className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-accent/10"
                        >
                          <SymbolView
                            name={
                              preview.playingSlug === slug
                                ? { ios: "stop.fill", android: "stop", web: "stop" }
                                : { ios: "play.fill", android: "play_arrow", web: "play_arrow" }
                            }
                            size={15}
                            tintColor={accent}
                          />
                        </PressableFeedback>
                      )}
                      {locked ? (
                        <SymbolView
                          name={{ ios: "lock.fill", android: "lock", web: "lock" }}
                          size={16}
                          tintColor={muted}
                        />
                      ) : (
                        <RadioIconIndicator symbol={opt.symbol} isSelected={isSelected} />
                      )}
                    </>
                  )}
                </RadioGroup.Item>
                {index < VOICE_OPTIONS.length - 1 && <Separator className="mx-5" />}
              </View>
            );
          })}
        </RadioGroup>
      </SettingsSection>
    </EaseView>
  );
};
