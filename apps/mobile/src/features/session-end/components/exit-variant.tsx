import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { EaseView } from "react-native-ease/uniwind";
import { useRouter } from "expo-router";
import { Button, LinkButton } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { CloseOffer } from "@/src/features/session-end/components/close-offer";
import { KindlingCloseSlot } from "@/src/features/session-end/components/kindling-close-slot";
import { SessionEndUpsell } from "@/src/features/insights/compounding-upsell";
import type { Id } from "@/convex/_generated/dataModel";
import { NIGHT_SESSION_END_EXIT } from "@/src/features/reflect/night-copy";

type Phase = "acknowledge" | "close";

type Props = {
  onHaveMore: () => void;
  isNight?: boolean;
  sessionId?: Id<"sessions">;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_SLOW = { type: "timing" as const, duration: 600, easing: EASING };
const EASE_IN = {
  type: "timing" as const,
  duration: 400,
  delay: 300,
  easing: EASING,
};
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };
const SLIDE_OUT = { opacity: 0, translateY: 20 };
const SLIDE_IN = { opacity: 1, translateY: 0 };

const styles = StyleSheet.create({
  mascot: {
    width: "100%",
    flex: 1,
  },
});

export const ExitVariant = ({
  onHaveMore,
  isNight = false,
  sessionId,
}: Props) => {
  const [phase, setPhase] = useState<Phase>("acknowledge");
  const router = useRouter();

  useEffect(() => {
    if (phase !== "acknowledge") return;
    const timer = setTimeout(() => setPhase("close"), 3500);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleTimelinePress = () => {
    router.push("/(protected)/timeline");
  };

  return (
    <View className="flex-1">
      {phase === "acknowledge" && (
        <Pressable
          onPress={() => setPhase("close")}
          className="flex-1 px-8 pb-8"
        >
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
            <AppText className="mb-3 font-serif text-3xl text-foreground">
              {isNight ? NIGHT_SESSION_END_EXIT : "Heard."}
            </AppText>
            <View className="flex-row flex-wrap">
              <AppText className="text-base font-light leading-7 text-foreground/40">
                It&apos;s saved to{" "}
              </AppText>
              <LinkButton size="sm" onPress={handleTimelinePress}>
                <LinkButton.Label className="text-base font-light text-accent/65">
                  your timeline
                </LinkButton.Label>
              </LinkButton>
              <AppText className="text-base font-light leading-7 text-foreground/40">
                {" "}
                whenever you want to come back.
              </AppText>
            </View>
          </EaseView>
        </Pressable>
      )}

      {phase === "close" && (
        <View className="flex-1 justify-center items-center px-8">
          <EaseView
            initialAnimate={SLIDE_OUT}
            animate={SLIDE_IN}
            transition={EASE_IN}
            className="w-full items-center gap-4"
          >
            <CloseOffer sessionId={sessionId} variant="exit" />
            <SessionEndUpsell sessionId={sessionId} />
            <KindlingCloseSlot sessionId={sessionId} />

            <Button
              variant="primary"
              size="lg"
              onPress={onHaveMore}
              accessibilityLabel="Start another session"
              className="w-full rounded-2xl"
            >
              <Button.Label>Start another session</Button.Label>
            </Button>
          </EaseView>
        </View>
      )}
    </View>
  );
};
