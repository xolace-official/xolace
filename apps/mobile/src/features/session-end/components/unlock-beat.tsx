// The unlock moment (#523, copy #513): a domain came into focus this session.
// The first unlock is a full-screen milestone; later ones a quiet card.
// Showing it marks it seen, so the next-day push stands down.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { EaseView } from "react-native-ease/uniwind";
import { PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { DOMAIN_META } from "@/src/features/insights/domains";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { playSoftPress } from "@/src/lib/haptics";

type Unlock = NonNullable<Doc<"sessions">["domainUnlock"]>;

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const TRANSITION = { type: "timing", duration: 440, easing: EASE } as const;

/** "Family is coming into focus." / "Work & Studies and Family are coming into focus." */
const titleOf = (domains: Unlock["domains"]) => {
  const labels = domains.map((d) => DOMAIN_META[d].label);
  const names = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0];
  return `${names} ${labels.length > 1 ? "are" : "is"} coming into focus.`;
};

const bodyOf = (domains: Unlock["domains"]) =>
  `You've shared enough for Xolace to see how ${domains.length > 1 ? "these parts" : "this part"} of life tend${domains.length > 1 ? "" : "s"} to feel for you. It only knows what you've told it here.`;

type Props = { sessionId: Id<"sessions">; unlock: Unlock | undefined };

export function UnlockBeat({ sessionId, unlock }: Props) {
  const router = useRouter();
  const markSeen = useMutation(api.compounding.unlocks.markSeen);
  const accent = useTokenColor("accent");
  const insets = useSafeAreaInsets();
  // The first unseen stamp, held: once seen, it changes underneath and must not
  // hide the beat. Not held on mount, since it lands a moment after (#529).
  const [shown, setShown] = useState<Unlock | null>(null);
  if (!shown && unlock && unlock.seenAt === undefined) setShown(unlock);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (shown) markSeen({ sessionId }).catch(() => {});
  }, [shown, sessionId, markSeen]);

  if (!shown || !open) return null;

  const seeIt = () => {
    playSoftPress();
    setOpen(false);
    router.push("/profile/insights");
  };
  const meta = DOMAIN_META[shown.domains[0]];

  if (!shown.first) {
    return (
      <EaseView initialAnimate={{ opacity: 0 }} animate={{ opacity: 1 }} transition={TRANSITION}>
        <View className="mx-5 mt-6 flex-row gap-3 rounded-2xl bg-surface border border-border/65 p-4">
          <View className="size-9 items-center justify-center rounded-xl bg-accent/12">
            <SymbolView name={meta.icon} size={17} tintColor={accent} />
          </View>
          <View className="flex-1 gap-1">
            <AppText className="text-[15px] font-medium text-foreground">{titleOf(shown.domains)}</AppText>
            <AppText className="text-[13px] leading-5 text-muted">{bodyOf(shown.domains)}</AppText>
            <PressableFeedback onPress={seeIt} accessibilityRole="button" hitSlop={12} className="self-start pt-1">
              <AppText className="text-[13px] font-semibold text-accent">See it</AppText>
            </PressableFeedback>
          </View>
        </View>
      </EaseView>
    );
  }

  return (
    <EaseView
      initialAnimate={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={TRANSITION}
      className="absolute inset-0 bg-background px-6"
      // Screen readers stay on the milestone, not the session end beneath it.
      accessibilityViewIsModal
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}
    >
      <View className="flex-1 justify-between">
        <View />
        <View className="items-center gap-8">
          <View className="size-24 items-center justify-center rounded-full bg-accent/12">
            <SymbolView name={meta.icon} size={40} tintColor={accent} />
          </View>
          <View className="items-center gap-3">
            <AppText className="text-3xl font-semibold text-foreground text-center leading-10">
              {titleOf(shown.domains)}
            </AppText>
            <AppText className="text-base text-foreground/50 text-center leading-6">{bodyOf(shown.domains)}</AppText>
          </View>
        </View>
        <View className="gap-3">
          <PressableFeedback
            onPress={seeIt}
            accessibilityRole="button"
            className="items-center rounded-full bg-accent/10 border border-accent/30 py-4"
          >
            <AppText className="text-base font-semibold text-accent">See it</AppText>
          </PressableFeedback>
          <PressableFeedback
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            className="items-center rounded-full border border-border py-4"
          >
            <AppText className="text-base font-light text-foreground/30">Not now</AppText>
          </PressableFeedback>
        </View>
      </View>
    </EaseView>
  );
}
