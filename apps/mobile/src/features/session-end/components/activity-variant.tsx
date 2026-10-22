import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { EaseView } from "react-native-ease/uniwind";
import { Button, PressableFeedback } from "heroui-native";
import { useQuery } from "convex/react";
import * as StoreReview from "expo-store-review";
import { UnsureFeedbackPrompt } from "@/src/features/session-end/components/unsure-feedback-prompt";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { CloseOffer } from "@/src/features/session-end/components/close-offer";
import { KindlingCloseSlot } from "@/src/features/session-end/components/kindling-close-slot";
import { SessionEndUpsell } from "@/src/features/insights/compounding-upsell";
import { Presets } from "react-native-pulsar";
import { ContributedConfirmation } from "@/src/features/session-end/components/contributed-confirmation";
import { HeavierFeedbackPrompt } from "@/src/features/session-end/components/heavier-feedback-prompt";

import { NIGHT_SESSION_END_ACTIVITY } from "@/src/features/reflect/night-copy";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";
type Phase = "acknowledge" | "mood" | "offer" | "close" | "contributed";

type Props = {
  sessionId?: Id<"sessions">;
  distilledText: string | null;
  contributeByDefault: boolean;
  onDismiss: (
    contributedReflection: boolean | null,
    mood?: PostSessionMood,
  ) => void;
  onHaveMore: (
    contributedReflection: boolean | null,
    mood?: PostSessionMood,
  ) => void;
  isNight?: boolean;
};

const MOODS = ["lighter", "same", "heavier", "unsure"] as const;

const MOOD_LABELS: Record<PostSessionMood, string> = {
  lighter: "lighter",
  same: "the same",
  heavier: "heavier",
  unsure: "not sure",
};

const MOOD_HAPTICS: Record<PostSessionMood, () => void> = {
  lighter: () => Presets.chirp(),
  same: () => Presets.plink(),
  heavier: () => Presets.plunk(),
  unsure: () => Presets.murmur(),
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_SLOW = { type: "timing" as const, duration: 600, easing: EASING };
const EASE_IN = {
  type: "timing" as const,
  duration: 400,
  delay: 200,
  easing: EASING,
};
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };
const SLIDE_OUT = { opacity: 0, translateY: 24 };
const SLIDE_IN = { opacity: 1, translateY: 0 };

const SCROLL_CONTENT = { flexGrow: 1 as const };

const styles = StyleSheet.create({
  mascot: {
    width: "100%",
    flex: 1,
  },
});

export const ActivityVariant = ({
  sessionId,
  distilledText,
  contributeByDefault,
  onDismiss,
  onHaveMore,
  isNight = false,
}: Props) => {
  const [phase, setPhase] = useState<Phase>("acknowledge");
  const [selectedMood, setSelectedMood] = useState<PostSessionMood | null>(
    null,
  );
  const [contributed, setContributed] = useState<boolean | null>(null);
  const [heavierSheetOpen, setHeavierSheetOpen] = useState(false);
  const [unsureSheetOpen, setUnsureSheetOpen] = useState(false);
  const canAsk = useQuery(api.feedback.canAskContextual);
  const canAskUnsure = useQuery(api.feedback.canAskUnsureContextual);

  const advancePhase = () => {
    if (phase === "acknowledge")
      setPhase(isNight ? (distilledText ? "offer" : "close") : "mood");
    else if (phase === "mood") setPhase(distilledText ? "offer" : "close");
    else if (phase === "offer") setPhase("close");
  };

  useEffect(() => {
    if (phase !== "acknowledge") return;
    const timer = setTimeout(() => {
      setPhase(isNight ? (distilledText ? "offer" : "close") : "mood");
    }, 4500);
    return () => clearTimeout(timer);
  }, [phase, isNight, distilledText]);

  useEffect(() => {
    if (phase === "close" && selectedMood === "lighter") {
      StoreReview.isAvailableAsync()
        .then((ok) => {
          if (ok) return StoreReview.requestReview();
        })
        .catch(console.error);
    }
  }, [phase, selectedMood]);

  const handleMoodPress = (mood: PostSessionMood) => {
    MOOD_HAPTICS[mood]();
    setSelectedMood(mood);
    // Open feedback sheets without blocking phase flow
    if (mood === "heavier" && canAsk === true) {
      setHeavierSheetOpen(true);
    }
    if (mood === "unsure" && canAskUnsure === true) {
      setUnsureSheetOpen(true);
    }
  };

  if (phase === "contributed") {
    return (
      <ContributedConfirmation
        onDone={() => {
          setContributed(true);
          setPhase("close");
        }}
      />
    );
  }

  return (
    <View className="flex-1">
      {/* ── Phase 1: Acknowledgment ── */}
      {phase === "acknowledge" && (
        <Pressable onPress={advancePhase} className="flex-1 px-8 pb-8">
          {/* TODO(mascot-video): Replace Image with VideoView once expo-video is installed in a store release. See TODOS.md — "Looping Mascot Video on Acknowledge Phase". */}
          <Image
            source={require("@/assets/images/flux/jump-love-bgremove.png")}
            style={styles.mascot}
            contentFit="contain"
          />
          <EaseView
            initialAnimate={FADE_OUT}
            animate={FADE_IN}
            transition={EASE_SLOW}
          >
            <AppText className="font-serif text-3xl leading-10 text-foreground">
              {isNight
                ? NIGHT_SESSION_END_ACTIVITY
                : "You showed up for\nyourself today."}
            </AppText>
          </EaseView>
        </Pressable>
      )}

      {/* ── Phase 2: Mood Check ── */}
      {phase === "mood" && (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={SCROLL_CONTENT}
        >
          <EaseView
            initialAnimate={SLIDE_OUT}
            animate={SLIDE_IN}
            transition={EASE_IN}
            className="flex-1"
          >
            {/* Header */}
            <View className="px-8 pt-14 pb-8">
              <AppText className="font-serif text-3xl text-foreground mb-2">
                How do you feel now?
              </AppText>
              <AppText className="text-sm font-light leading-5 text-foreground/40">
                Your answer stays private. It helps you notice patterns over
                time.
              </AppText>
            </View>

            {/* Mood pills */}
            <View className="px-8 gap-4">
              {MOODS.map((mood) => (
                <PressableFeedback
                  key={mood}
                  onPress={() => handleMoodPress(mood)}
                  accessibilityLabel={MOOD_LABELS[mood]}
                  className={`w-full rounded-2xl border px-5 py-4 ${
                    selectedMood === mood
                      ? "border-accent/40 bg-accent/10"
                      : "border-border/65 bg-surface/30"
                  }`}
                >
                  <AppText
                    className={`text-base text-center ${
                      selectedMood === mood
                        ? "text-accent font-medium"
                        : "text-foreground/55 font-light"
                    }`}
                  >
                    {MOOD_LABELS[mood]}
                  </AppText>
                </PressableFeedback>
              ))}
            </View>

            {/* Spacer pushes CTA to bottom */}
            <View className="flex-1" />

            {/* Pinned CTA */}
            <View className="px-8 pt-6 pb-12">
              <Button
                onPress={advancePhase}
                accessibilityLabel={selectedMood ? "Continue" : "Skip for now"}
                variant="outline"
                size="lg"
                className={`w-full rounded-2xl ${
                  selectedMood
                    ? "border-foreground/20 bg-foreground/5"
                    : "border-border/40"
                }`}
              >
                <Button.Label
                  className={`text-sm ${
                    selectedMood ? "text-foreground/70" : "text-foreground/25"
                  }`}
                >
                  {selectedMood ? "Continue" : "Skip for now"}
                </Button.Label>
              </Button>
            </View>
          </EaseView>
        </ScrollView>
      )}

      {/* ── Phase 3: The Offer ── */}
      {phase === "offer" && distilledText && (
        <View className="flex-1">
          <EaseView
            initialAnimate={SLIDE_OUT}
            animate={SLIDE_IN}
            transition={EASE_IN}
            className="flex-1"
          >
            {/* Header */}
            <View className="px-8 pt-14 pb-8">
              <AppText className="font-serif text-3xl text-foreground mb-2">
                Leave it for someone.
              </AppText>
              <AppText className="text-sm font-light leading-5 text-foreground/40">
                Someone out there might be carrying something just like this.
              </AppText>
            </View>

            {/* Distilled text card */}
            <View className="px-8 mb-6 rounded-2xl border border-foreground/55 bg-surface/40 mx-8 py-4">
              <AppText className="text-sm font-light italic leading-6 text-foreground/55">
                {`"${distilledText}"`}
              </AppText>
            </View>

            {/* Spacer */}
            <View className="flex-1" />

            {/* Action buttons pinned at bottom */}
            <View className="px-8 gap-3 pb-12">
              <Button
                onPress={() => setPhase("contributed")}
                accessibilityLabel="Yes, share anonymously"
                variant={contributeByDefault ? "outline" : "primary"}
                size="lg"
                className={`w-full rounded-2xl ${
                  contributeByDefault
                    ? "border-accent/40 bg-accent/20"
                    : ""
                }`}
              >
                <Button.Label
                  className={`text-base ${
                    contributeByDefault
                      ? "text-accent font-medium"
                      : ""
                  }`}
                >
                  Yes, anonymously
                </Button.Label>
              </Button>
              <Button
                onPress={() => {
                  setContributed(false);
                  advancePhase();
                }}
                accessibilityLabel="Not this time"
                variant="ghost"
                size="lg"
                className="w-full rounded-2xl"
              >
                <Button.Label className="text-sm text-foreground/30 font-light">
                  Not this time
                </Button.Label>
              </Button>
            </View>
          </EaseView>
        </View>
      )}

      {/* ── Phase 4: Close ── */}
      {phase === "close" && (
        <View className="flex-1 justify-center items-center px-8">
          <EaseView
            initialAnimate={FADE_OUT}
            animate={FADE_IN}
            transition={EASE_IN}
            className="w-full items-center gap-5"
          >
            <CloseOffer sessionId={sessionId} variant="activity" />
            <SessionEndUpsell sessionId={sessionId} />
            <KindlingCloseSlot sessionId={sessionId} />
            <Button
              variant="primary"
              size="lg"
              onPress={() => onHaveMore(contributed, selectedMood ?? undefined)}
              accessibilityLabel="Start another session"
              className="w-full rounded-2xl"
            >
              <Button.Label>Start another session</Button.Label>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onPress={() => onDismiss(contributed, selectedMood ?? undefined)}
              accessibilityLabel="I'm done for now"
              className="w-full rounded-2xl"
            >
              <Button.Label className="text-foreground/70">
                I&apos;m done for now
              </Button.Label>
            </Button>
          </EaseView>
        </View>
      )}

      <HeavierFeedbackPrompt
        sessionId={sessionId}
        isOpen={heavierSheetOpen}
        onClose={() => setHeavierSheetOpen(false)}
      />

      <UnsureFeedbackPrompt
        sessionId={sessionId}
        isOpen={unsureSheetOpen}
        onClose={() => setUnsureSheetOpen(false)}
      />
    </View>
  );
};
