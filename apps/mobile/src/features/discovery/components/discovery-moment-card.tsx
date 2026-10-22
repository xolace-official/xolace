import { View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { getEmotionEmoji, getEmotionLabel } from "@/src/features/timeline/emotions";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import type { TimelineEntry } from "@/src/features/timeline/types";

const SPEAKER_ICON: { ios: SFSymbol; android: string; web: string } = {
  ios: "speaker.wave.2.fill",
  android: "volume_up",
  web: "volume_up",
};

type Props = {
  entry: TimelineEntry;
};

/**
 * Presentational only — no PressableFeedback here. The stacked carousel's
 * animated card wrapper is pointerEvents:"none" (the invisible scroll layer
 * on top is the real touch target), so this component just renders content;
 * StackedCarousel's `onCardPress` handles the tap.
 */
export function DiscoveryMomentCard({ entry }: Props) {
  const accentColor = useThemeColor("accent");
  const emoji = getEmotionEmoji(entry.granularLabel ?? entry.primaryEmotion);
  const emotionLabel = getEmotionLabel(entry.granularLabel ?? entry.primaryEmotion);
  const hasAudio = entry.hasMirrorAudio;

  return (
    <View className="flex-1 justify-between p-4">
      {hasAudio ? (
        <View
          className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-accent-foreground"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <SymbolView name={SPEAKER_ICON as any} size={22} tintColor={accentColor as string} />
        </View>
      ) : null}

      <AppText
        className={`text-base italic leading-6 text-foreground ${hasAudio ? "pr-10" : ""}`}
        numberOfLines={4}
      >
        &ldquo;{removeEmDash(entry.mirrorText)}&rdquo;
      </AppText>

      <View className="flex-row items-center gap-2">
        <AppText className="text-base">{emoji}</AppText>
        <AppText className="shrink text-sm text-foreground/65" numberOfLines={1}>
          {emotionLabel}
        </AppText>
      </View>
    </View>
  );
}
