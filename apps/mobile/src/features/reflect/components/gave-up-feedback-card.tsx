import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";

const OPTIONS = [
  { key: "mirror_kept_missing", label: "The mirror kept missing" },
  { key: "figured_it_out", label: "I found it myself" },
  { key: "needed_to_vent", label: "I just needed to express it" },
] as const;

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_ANIMATE_VISIBLE = { opacity: 1 };
const EASE_ANIMATE_HIDDEN = { opacity: 0 };
const EASE_TRANSITION = {
  type: "timing" as const,
  duration: 200,
  easing: EASING,
};

type Props = {
  sessionId: Id<"sessions">;
};

export const GaveUpFeedbackCard = ({ sessionId }: Props) => {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);
  const submitFeedback = useMutation(api.feedback.submit);
  const posthog = usePostHog();

  if (!mounted) return null;

  const handleOption = (key: string) => {
    submitFeedback({
      type: "gave_up",
      sessionId,
      selectedOption: key,
    })
      .then(() => {
        setVisible(false);
        posthog.capture("feedback_submitted", {
          type: "gave_up",
          has_text: false,
          has_option: true,
        });
      })
      .catch((e) => console.error("gave_up feedback failed", e));
  };

  return (
    <EaseView
      animate={visible ? EASE_ANIMATE_VISIBLE : EASE_ANIMATE_HIDDEN}
      transition={EASE_TRANSITION}
      onTransitionEnd={({ finished }) => {
        if (finished && !visible) setMounted(false);
      }}
    >
      <View className="mx-5 mt-4 p-4 rounded-2xl bg-surface border border-overlay/20">
        <AppText className="text-sm text-foreground/60 mb-3">
          What happened?
        </AppText>

        <View className="gap-2">
          {OPTIONS.map(({ key, label }) => (
            <PressableFeedback
              key={key}
              onPress={() => handleOption(key)}
              accessibilityLabel={label}
              className="w-full py-3 rounded-xl bg-accent/10 items-center active:opacity-70"
            >
              <AppText className="text-sm font-medium text-accent">
                {label}
              </AppText>
            </PressableFeedback>
          ))}
        </View>
      </View>
    </EaseView>
  );
};
