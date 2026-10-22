import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { MorphLoader } from "@/src/components/shared/loader/morph/morph-loader";
import { useIsPreview, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Card, PressableFeedback, useThemeColor } from "heroui-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { useMirrorAudio } from "@/src/features/reflect/hooks/use-mirror-audio";
import {
  getEmotionEmoji,
  getEmotionLabel,
  getPathLabel,
} from "@/src/features/timeline/emotions";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { TalkTranscript } from "@/src/features/talk/talk-thread";

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return {
    day: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
};

const BACK_ICON = {
  ios: "chevron.left",
  android: "arrow_back",
  web: "arrow_back",
} as const;
const SPEAKER_PLAYING = {
  ios: "speaker.wave.2.fill",
  android: "volume_up",
  web: "volume_up",
} as const;
const SPEAKER_MUTED = {
  ios: "speaker.fill",
  android: "volume_off",
  web: "volume_off",
} as const;
const AUDIO_ANIMATION = {
  scale: { ignoreScaleCoefficient: true, value: 0.85 },
};
const A11Y_SELECTED = { selected: true };
const A11Y_UNSELECTED = { selected: false };

const TONE_BADGE: Partial<Record<string, { text: string; border: string }>> = {
  poetic: { text: "text-tone-poetic", border: "border-tone-poetic/40" },
  gentle: { text: "text-tone-gentle", border: "border-tone-gentle/40" },
  direct: { text: "text-tone-direct", border: "border-tone-direct/40" },
  witnessed: {
    text: "text-tone-witnessed",
    border: "border-tone-witnessed/40",
  },
};

const SectionLabel = ({ children }: { children: string }) => (
  <AppText className="mb-3 text-xs uppercase tracking-widest text-foreground/35">
    {children}
  </AppText>
);

export const SessionDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor("foreground") as string;

  const sessionId = id ? (id as Id<"sessions">) : null;

  const details = useQuery(
    api.sessions.getSessionDetails,
    sessionId ? { sessionId } : "skip",
  );
  const { isReady, isPlaying, toggle } = useMirrorAudio(sessionId);

  // A long-press preview is a card, not a screen: no back button, no notch inset.
  const isPreview = useIsPreview();
  const topInsetStyle = { paddingTop: isPreview ? 0 : insets.top };

  if (!id) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={topInsetStyle}
      >
        <AppText className="text-foreground/40">
          No session ID provided.
        </AppText>
      </View>
    );
  }

  if (details === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={topInsetStyle}
      >
        <MorphLoader />
      </View>
    );
  }

  if (!details) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={topInsetStyle}
      >
        <AppText className="text-foreground/40">Session not found.</AppText>
      </View>
    );
  }

  const { day, time } = formatDate(details.createdAt);
  const emotion = details.granularLabel ?? details.primaryEmotion ?? null;
  const emoji = getEmotionEmoji(emotion);
  const emotionLabel = getEmotionLabel(emotion);
  const pathLabel = getPathLabel(details.pathChosen ?? null);
  const toneLabel = details.toneUsed
    ? details.toneUsed.charAt(0).toUpperCase() + details.toneUsed.slice(1)
    : null;
  const toneBadge = details.toneUsed
    ? (TONE_BADGE[details.toneUsed] ?? {
        text: "text-foreground/40",
        border: "border-foreground/20",
      })
    : null;
  const speakerName = isPlaying ? SPEAKER_PLAYING : SPEAKER_MUTED;

  return (
    <View className="flex-1 bg-background" style={topInsetStyle}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back button */}
        {!isPreview && (
          <View className="px-6 pb-1 pt-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="self-start"
            >
              <SymbolView name={BACK_ICON} size={20} tintColor={tintColor} />
            </Pressable>
          </View>
        )}

        {/* Date + time */}
        <View className="px-6 pb-8 pt-5">
          <AppText className="text-base font-medium text-foreground/55">
            {day}
          </AppText>
          <AppText className="mt-0.5 text-base font-medium text-foreground/55">
            {time}
          </AppText>
        </View>

        <View className="px-6">
          {/* User input: a talk's is its thread, under the mirror */}
          {details.rawInput && details.entryType !== "talk" && (
            <>
              <SectionLabel>You said</SectionLabel>
              <Card
                variant="tertiary"
                className="mb-8 rounded-2xl border border-foreground/10"
                style={styles.continuousBorder}
              >
                <Card.Body className="px-5 py-4">
                  <AppText
                    className="text-sm font-light leading-6 text-foreground/55"
                    selectable
                  >
                    &ldquo;{details.rawInput}&rdquo;
                  </AppText>
                </Card.Body>
              </Card>
            </>
          )}

          {/* Mirror */}
          {details.mirrorText && (
            <>
              <View className="mb-3 flex-row items-center gap-3">
                <SectionLabel>The mirror</SectionLabel>
                {isReady ? (
                  <PressableFeedback
                    onPress={toggle}
                    animation={AUDIO_ANIMATION}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPlaying ? "Pause mirror audio" : "Play mirror audio"
                    }
                    accessibilityHint="Toggles playback of the mirror response"
                    accessibilityState={
                      isPlaying ? A11Y_SELECTED : A11Y_UNSELECTED
                    }
                    className="-mt-3"
                  >
                    <SymbolView
                      name={speakerName}
                      size={16}
                      tintColor={tintColor}
                    />
                  </PressableFeedback>
                ) : null}
                {toneLabel && toneBadge ? (
                  <View
                    className={`-mt-3 rounded-full border px-2.5 py-0.5 ${toneBadge.border}`}
                  >
                    <AppText className={`text-xs ${toneBadge.text}`}>
                      {toneLabel}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText
                className="mb-8 text-xl font-light italic leading-9 text-foreground"
                selectable
              >
                &ldquo;{removeEmDash(details.mirrorText)}&rdquo;
              </AppText>
            </>
          )}

          {details.entryType === "talk" && sessionId && (
            <View className="mb-8">
              <SectionLabel>The talk</SectionLabel>
              <TalkTranscript sessionId={sessionId} name={details.companionName} />
            </View>
          )}

          {/* Emotion row */}
          <View className="flex-row items-center gap-2">
            <AppText className="text-base">{emoji}</AppText>
            <AppText className="text-sm text-foreground/65">
              {emotionLabel}
            </AppText>
            {pathLabel ? (
              <>
                <AppText className="text-sm text-foreground/25">
                  &middot;
                </AppText>
                <AppText className="text-sm text-foreground/40">
                  {pathLabel}
                </AppText>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },
  continuousBorder: { borderCurve: "continuous" },
});
