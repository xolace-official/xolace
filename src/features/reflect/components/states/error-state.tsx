import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { EaseView } from "react-native-ease/uniwind";
import { LinkButton, ScrollShadow } from "heroui-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/src/components/shared/app-text";
import { isRateLimitMessage } from "@/src/features/reflect/session-service";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { playErrorNotice } from "@/src/lib/haptics";

type Props = {
  errorMessage: string;
  /** The session's stored input. Empty when no session holds it (submit rolled back). */
  rawInput: string;
  onRetry: () => void;
  onReset: () => void;
};

// ponytail: copy pending safety review — never name the category or imply fault.
const REJECTED_COPY =
  "This is something I can't reflect back here. If it's weighing on you, talking to someone can help.";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const EASE_UPGRADE = {
  type: "timing" as const,
  duration: 400,
  delay: 200,
  easing: EASING,
};
const EASE_RETRY = {
  type: "timing" as const,
  duration: 400,
  delay: 300,
  easing: EASING,
};
const EASE_RESET = {
  type: "timing" as const,
  duration: 400,
  delay: 400,
  easing: EASING,
};

export const ErrorState = ({
  errorMessage,
  rawInput,
  onRetry,
  onReset,
}: Props) => {
  const { isPlus } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);
  // The hourly cap is the free/Plus gate — the one place the ceiling is
  // unmissable — so free users get the door instead of a dead end.
  const showUpgrade = !isPlus && isRateLimitMessage(errorMessage);
  // The safeguard's rejection code (convex/ai/safeguard.ts). Retry reprocesses
  // the same stored input, so it can only fail again — offer support instead.
  const rejected = errorMessage === "content_policy_violation";
  const router = useRouter();

  useEffect(() => {
    playErrorNotice();
  }, []);

  return (
    <View className="flex-1 justify-center px-6">
      <AppText className="text-xl leading-8 text-foreground">
        Take a breath.
      </AppText>

      <AppText className="mt-4 text-base leading-6 text-foreground/40">
        {rejected ? REJECTED_COPY : errorMessage}
      </AppText>

      {showUpgrade ? (
        <AppText className="mt-3 text-base leading-6 text-foreground/40">
          Xolace+ raises the hourly limit.
        </AppText>
      ) : null}

      {/* A failure must never look like the writing vanished. Literally true:
          the text shown is the stored session input that retry reprocesses. */}
      {rawInput ? (
        <View className="mt-8">
          <AppText className="mb-2 text-sm text-foreground/40">
            Your words are still here.
          </AppText>
          <ScrollShadow
            LinearGradientComponent={LinearGradient}
            size={28}
            className="max-h-[160]"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText className="text-base italic leading-7 text-foreground/30">
                {rawInput}
              </AppText>
            </ScrollView>
          </ScrollShadow>
        </View>
      ) : null}

      <View className="mt-14 gap-6">
        {showUpgrade ? (
          <EaseView
            initialAnimate={EASE_INITIAL}
            animate={EASE_ANIMATE}
            transition={EASE_UPGRADE}
          >
            <LinkButton
              accessibilityLabel="See Xolace Plus"
              onPress={() => openPaywall("rate_limit")}
              size="md"
              className="self-start"
            >
              <LinkButton.Label className="font-semibold text-accent">
                See Xolace+
              </LinkButton.Label>
            </LinkButton>
          </EaseView>
        ) : null}

        <EaseView
          initialAnimate={EASE_INITIAL}
          animate={EASE_ANIMATE}
          transition={EASE_RETRY}
        >
          {rejected ? (
            <LinkButton
              accessibilityLabel="Talk to someone"
              onPress={() => router.push("/(protected)/crisis-resources")}
              size="md"
              className="self-start"
            >
              <LinkButton.Label className="font-semibold text-accent">
                Talk to someone
              </LinkButton.Label>
            </LinkButton>
          ) : (
            <LinkButton
              accessibilityLabel="Try again"
              onPress={onRetry}
              size="md"
              className="self-start"
            >
              <LinkButton.Label
                className={
                  showUpgrade
                    ? "text-foreground/55"
                    : "font-semibold text-accent"
                }
              >
                Try again
              </LinkButton.Label>
            </LinkButton>
          )}
        </EaseView>

        <EaseView
          initialAnimate={EASE_INITIAL}
          animate={EASE_ANIMATE}
          transition={EASE_RESET}
        >
          <LinkButton
            accessibilityLabel="Start fresh"
            onPress={onReset}
            size="md"
            className="self-start"
          >
            <LinkButton.Label className="text-foreground/55">
              Start fresh
            </LinkButton.Label>
          </LinkButton>
        </EaseView>
      </View>
    </View>
  );
};
