import { useRef } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { PressableFeedback } from "heroui-native";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { OptionCard, type IconKey } from "@/src/features/follow-up/stack-cards";
import { LINK } from "@/src/features/follow-up/still-here-step";
import {
  HEAVIER_MESSAGE,
  HEAVIER_OPTIONS,
  HEAVIER_SKIP,
} from "@/src/features/reflect/follow-up-copy";

// Keyed on the schema union, so a copy key the server would reject fails typecheck.
type Choice = NonNullable<Doc<"follow_up_responses">["heavierChoice"]>;

// The content doorways are the still-here ones — their screens open the
// first-time intro themselves when the flag is unset, from any entry point.
const DOORWAY: Record<Choice, { icon: IconKey; tint: string; href: Href }> = {
  crisis_resources: { icon: "lifebuoy", tint: "bg-warning/20", href: "/crisis-resources" },
  music: LINK.music,
  support_audio: LINK.support,
  library: LINK.library,
};

/**
 * The `heavier` next step (#452): support first, then three places to turn.
 * A tap records the choice (#447 table); leaving without one is fine — the
 * chip answer already stands. Never routes to sit-with-this.
 */
export function HeavierStep({
  cardId,
  onClose,
}: {
  cardId: Id<"follow_up_cards">;
  onClose: () => void;
}) {
  const router = useRouter();
  const posthog = usePostHog();
  const record = useMutation(api.followUpResponses.record);
  const leaving = useRef(false);

  const pick = (choice: Choice) => {
    // A double tap would run back() twice and pop past reflect.
    if (leaving.current) return;
    void record({ cardId, shareRequested: false, heavierChoice: choice });
    posthog.capture("follow_up_heavier_choice", { choice });
    if (choice === "crisis_resources") {
      // Pushed over the check-in, like the acute resources link — back returns here.
      router.push(DOORWAY.crisis_resources.href);
      return;
    }
    leaving.current = true;
    router.back();
    router.replace(DOORWAY[choice].href, { withAnchor: true });
  };

  return (
    <>
      <View className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface">
        <View className="bg-accent/20 px-5 pb-12 pt-5">
          <AppText className="text-base leading-6 text-foreground/80">{HEAVIER_MESSAGE}</AppText>
        </View>
      </View>
      {HEAVIER_OPTIONS.map(({ key, title, sub }) => (
        <OptionCard
          key={key}
          icon={DOORWAY[key].icon}
          tint={DOORWAY[key].tint}
          title={title}
          sub={sub}
          onPress={() => pick(key)}
        />
      ))}
      <View className="items-center bg-surface pt-4">
        <PressableFeedback
          onPress={onClose}
          accessibilityRole="button"
          hitSlop={12}
          className="min-h-11 items-center justify-center"
        >
          <AppText className="text-sm text-foreground/55">{HEAVIER_SKIP}</AppText>
        </PressableFeedback>
      </View>
    </>
  );
}
