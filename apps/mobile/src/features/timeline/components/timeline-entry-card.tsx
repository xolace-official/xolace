import { Link } from "expo-router";
import { PressableFeedback, Card, cn } from "heroui-native";
import { Presets } from "react-native-pulsar";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import {
  getEmotionEmoji,
  getEmotionLabel,
  getPathLabel,
} from "@/src/features/timeline/emotions";
import type { TimelineEntry } from "@/src/features/timeline/types";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";

type Props = {
  entry: TimelineEntry;
  className?: string;
};

const styles = StyleSheet.create({
  continuousCurve: { borderCurve: "continuous" },
});

const PRESS_ANIMATION = { scale: { value: 0.98 } };

const TONE_BADGE: Partial<Record<string, { text: string; border: string }>> = {
  poetic: { text: "text-tone-poetic", border: "border-tone-poetic/40" },
  gentle: { text: "text-tone-gentle", border: "border-tone-gentle/40" },
  direct: { text: "text-tone-direct", border: "border-tone-direct/40" },
  witnessed: {
    text: "text-tone-witnessed",
    border: "border-tone-witnessed/40",
  },
};

export const TimelineEntryCard = ({ entry, className }: Props) => {
  const reduced = useEffectiveReducedMotion();

  const emoji = getEmotionEmoji(entry.granularLabel ?? entry.primaryEmotion);
  const emotionLabel = getEmotionLabel(
    entry.granularLabel ?? entry.primaryEmotion,
  );
  const pathLabel = getPathLabel(entry.pathChosen);
  const toneLabel = entry.toneUsed
    ? entry.toneUsed.charAt(0).toUpperCase() + entry.toneUsed.slice(1)
    : null;
  const toneBadge = entry.toneUsed
    ? (TONE_BADGE[entry.toneUsed] ?? {
        text: "text-foreground/40",
        border: "border-foreground/20",
      })
    : null;

  return (
    <Link
      href={{
        pathname: "/(protected)/timeline/session/[id]",
        params: { id: entry.id },
      }}
      onPress={() => Presets.ping()}
      asChild
    >
      <Link.Trigger withAppleZoom={!reduced}>
        <PressableFeedback
          animation={PRESS_ANIMATION}
          className={cn("mx-5 mb-3", className)}
        >
          <Card
            variant="tertiary"
            className="rounded-2xl border border-foreground/10"
            style={styles.continuousCurve}
          >
            <Card.Body className="gap-4 px-3 py-3">
              <AppText
                className="text-base italic leading-7 text-foreground"
                numberOfLines={3}
              >
                &ldquo;{removeEmDash(entry.mirrorText)}&rdquo;
              </AppText>

              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row flex-1 items-center gap-2 overflow-hidden">
                  <AppText className="text-base">{emoji}</AppText>
                  <AppText
                    className="shrink text-sm text-foreground/65"
                    numberOfLines={1}
                  >
                    {emotionLabel}
                  </AppText>
                  <AppText className="text-sm text-foreground/25">
                    &middot;
                  </AppText>
                  <AppText
                    className="shrink text-sm text-foreground/40"
                    numberOfLines={1}
                  >
                    {pathLabel}
                  </AppText>
                </View>

                {toneLabel && toneBadge ? (
                  <View
                    className={`rounded-full border px-2.5 py-0.5 ${toneBadge.border}`}
                  >
                    <AppText className={`text-xs ${toneBadge.text}`}>
                      {toneLabel}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Card.Body>
          </Card>
        </PressableFeedback>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
};
