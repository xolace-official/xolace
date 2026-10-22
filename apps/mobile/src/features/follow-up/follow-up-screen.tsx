import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { Image } from "expo-image";
import { PressableFeedback } from "heroui-native";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { useFullContext } from "@/src/lib/convex/use-full-context";
import { playFollowUpEntrance } from "@/src/lib/haptics";
import { cn } from "@/src/lib/utils";
import { HeavierStep } from "@/src/features/follow-up/heavier-step";
import { ReflectiveStep } from "@/src/features/follow-up/reflective-step";
import { StillHereStep } from "@/src/features/follow-up/still-here-step";
import { Icon, OptionCard, type IconKey } from "@/src/features/follow-up/stack-cards";
import {
  chipsForTier,
  FOLLOW_UP_FALLBACK_HEADLINE,
  FOLLOW_UP_MASCOT_LABEL,
  FOLLOW_UP_RESOURCES_LABEL,
  STEP_HEADLINE,
  VENT_A11Y_LABEL,
  VENT_LABEL,
  VENT_SUBLABEL,
  type FollowUpResponse,
  type FollowUpTier,
  type StatusResponse,
} from "@/src/features/reflect/follow-up-copy";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";

// Dev/preview storage buckets differ from prod (Convex deploys are per-env).
const FLUX = {
  uri: __DEV__
    ? "https://groovy-mandrill-892.eu-west-1.convex.cloud/api/storage/433565d2-012f-4938-b99a-7a3b77ebd8a1"
    : "https://energetic-guineapig-283.convex.cloud/api/storage/1dbf90a4-aa6b-41fe-b16c-49677fa82bd5",
};
const FLUX_SMALL = require("@/assets/images/flux/flux-point-down-removebg-preview.png");

const STATUS_LOOK: Record<StatusResponse, { icon: IconKey; tint: string }> = {
  lighter: { icon: "sun", tint: "bg-success/20" },
  still_here: { icon: "cloud", tint: "bg-frost/20" },
  heavier: { icon: "rain", tint: "bg-accent/20" },
  processed: { icon: "seal", tint: "bg-ember/25" },
};

export type FollowUpParams = {
  cardId: Id<"follow_up_cards">;
  /** Absent on restored or deep-linked routes — falls back to generic copy. */
  cardText?: string;
  tier: FollowUpTier;
  /** "1" when the card came out of an escalation — shows the resources link. */
  escalation?: string;
};

/**
 * The full-screen follow-up check-in (#448). Picker → per-answer next step.
 * `lighter` and `processed` share the reflective step (#449, #450), `still_here`
 * and `heavier` get their own (#451, #452).
 */
export function FollowUpScreen() {
  const { cardId, cardText, tier, escalation } = useLocalSearchParams<FollowUpParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const resolveCard = useMutation(api.followUps.resolveCard);
  const streak = useFullContext()?.streak ?? 0;
  const [picked, setPicked] = useState<StatusResponse | null>(null);
  const answered = useRef(false);
  const escalationDerived = escalation === "1";

  // One cue per open, same for every tier — the screen is the single trigger.
  useEffect(() => playFollowUpEntrance(), []);

  // Leaving before an answer — close, Android back, anything that unmounts the
  // route — is today's no-guilt dismiss. An answer, once given, stands.
  useEffect(
    () => () => {
      if (answered.current) return;
      void resolveCard({ cardId, response: "dismissed" });
      posthog.capture("follow_up_dismissed", { tier, escalation_derived: escalationDerived });
    },
    [cardId, tier, escalationDerived, resolveCard, posthog],
  );

  // Returns false on a second tap (double tap, chip-then-vent) so it can't navigate or log twice.
  const answer = (response: FollowUpResponse) => {
    if (answered.current) return false;
    answered.current = true;
    void resolveCard({ cardId, response });
    posthog.capture("follow_up_responded", { response, tier, escalation_derived: escalationDerived });
    return true;
  };

  const close = () => router.back();

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface-secondary">
      <View className="flex-1 overflow-hidden" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-5">
          <View>
            <AppText className="font-medium text-lg text-foreground">Checking back in</AppText>
            <View className="mt-1 h-1.5 w-24 rounded-full bg-foreground/10">
              <View className={cn("h-1.5 rounded-full bg-accent", picked ? "w-full" : "w-1/2")} />
            </View>
          </View>
          <View className="flex-row gap-2">
            {streak > 0 && (
              <View
                className="h-10 flex-row items-center gap-1.5 rounded-full bg-foreground/10 px-3.5"
                accessibilityLabel={`${streak}-day streak`}
              >
                <Icon name="flame" size={16} />
                <AppText className="text-foreground">{streak}</AppText>
              </View>
            )}
            <PressableFeedback
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close check-in"
              hitSlop={8}
              className="size-10 items-center justify-center rounded-full bg-foreground/10"
            >
              <Icon name="close" size={14} />
            </PressableFeedback>
          </View>
        </View>
        <Image
          source={picked ? FLUX_SMALL : FLUX}
          contentFit="contain"
          style={picked ? styles.heroSmall : styles.hero}
          accessibilityLabel={FOLLOW_UP_MASCOT_LABEL}
        />
        <AppText className="px-6 pb-12 font-serif text-xl leading-8 text-foreground">
          {picked ? removeEmDash(STEP_HEADLINE[picked]) : removeEmDash(cardText || FOLLOW_UP_FALLBACK_HEADLINE)}
        </AppText>
      </View>

      <ScrollView
        className="-mt-8 grow-0"
        style={styles.stack}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {picked === "lighter" || picked === "processed" ? (
          <ReflectiveStep
            answer={picked}
            cardId={cardId}
            streak={streak}
            canShare={tier !== "acute" && !escalationDerived}
            onClose={close}
          />
        ) : picked === "still_here" ? (
          <StillHereStep onClose={close} />
        ) : picked === "heavier" ? (
          <HeavierStep cardId={cardId} onClose={close} />
        ) : (
          <>
            {chipsForTier(tier).map(({ key, label }) => (
              <OptionCard
                key={key}
                icon={STATUS_LOOK[key].icon}
                tint={STATUS_LOOK[key].tint}
                title={label}
                onPress={() => {
                  if (answer(key)) setPicked(key);
                }}
              />
            ))}
            <OptionCard
              icon="mic"
              tint="bg-surface"
              title={VENT_LABEL}
              sub={VENT_SUBLABEL}
              a11yLabel={VENT_A11Y_LABEL}
              onPress={() => {
                if (answer("vent")) router.replace("/(protected)/voice-vent");
              }}
            />
          </>
        )}
        <View className="items-center bg-surface pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
          {!picked && (tier === "acute" || escalationDerived) && (
            <PressableFeedback
              onPress={() => {
                posthog.capture("follow_up_resources_tapped", { tier });
                router.push("/crisis-resources");
              }}
              accessibilityRole="link"
              accessibilityLabel={FOLLOW_UP_RESOURCES_LABEL}
              hitSlop={12}
              className="min-h-11 items-center justify-center"
            >
              <AppText className="text-sm text-warning/90 underline">{FOLLOW_UP_RESOURCES_LABEL}</AppText>
            </PressableFeedback>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, marginTop: 8 },
  heroSmall: { width: 120, height: 100, marginTop: 16, marginLeft: 16 },
  stack: { maxHeight: "68%" },
});
