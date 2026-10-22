import { useEffect, useRef } from "react";
import { View } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { playSoftPress } from "@/src/lib/haptics";

type Props = {
  sessionId?: Id<"sessions">;
};

/** Rounded-square icon badge: flame for pro, lock for the free upsell. */
function KindlingIconTile({ locked }: { locked: boolean }) {
  const accent = useThemeColor("accent") as string;
  return (
    <View className="h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/12">
      <SymbolView
        name={
          locked
            ? { ios: "lock.fill", android: "lock", web: "lock" }
            : {
                ios: "flame.fill",
                android: "local_fire_department",
                web: "local_fire_department",
              }
        }
        size={22}
        tintColor={accent}
      />
    </View>
  );
}

/**
 * Session-end's two kindling slots (docs/paths-v1.md §11-§12, #337) — a
 * premium "your kindling is being set up" card, and the free-user upsell in
 * the same spot. Both are gated on the session actually qualifying for
 * kindling (`supportNeed` light/active, §1) — ADR 0009 scopes the free-user
 * upsell to "a qualifying session," not every session-end, and the premium
 * card would otherwise promise setup that never runs. Independent of
 * `CloseOffer`'s proactive-moment picker: no cooldown, no budget.
 *
 * Renders nothing while entitlement or qualification is still resolving —
 * flashing the wrong state for a frame is worse than a beat late.
 */
export const KindlingCloseSlot = ({ sessionId }: Props) => {
  const { isPlus, isResolved } = usePlusEntitlement();
  const qualifies = useQuery(
    api.paths.isKindlingQualifyingSession,
    sessionId ? { sessionId } : "skip",
  );
  const posthog = usePostHog();
  const openPaywall = usePaywall((s) => s.open);
  const shownRef = useRef(false);

  const ready = isResolved && qualifies !== undefined;

  useEffect(() => {
    if (!ready || isPlus || !qualifies || shownRef.current) return;
    shownRef.current = true;
    posthog.capture("plus_upsell_shown", { surface: "kindling" });
  }, [ready, isPlus, qualifies, posthog]);

  if (!ready || !qualifies) return null;

  if (isPlus) {
    return (
      <View className="w-full flex-row items-center gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-5 py-4">
        <KindlingIconTile locked={false} />
        <View className="flex-1">
          <AppText className="text-base font-medium text-foreground">
            Setting up your kindling…
          </AppText>
          <AppText className="mt-0.5 text-xs font-light text-foreground/55">
            What next? Check back soon on the discovery screen for the curated support actions for you.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <PressableFeedback
      onPress={() => {
        playSoftPress();
        posthog.capture("plus_upsell_tapped", { surface: "kindling" });
        openPaywall("kindling", { sessionId });
      }}
      accessibilityRole="button"
      accessibilityLabel="See what Xolace+ sets up"
      className="w-full flex-row items-center gap-3 rounded-2xl border border-accent/40 bg-accent/15 px-5 py-4"
    >
      <KindlingIconTile locked={true} />
      <View className="flex-1">
        <AppText className="text-base font-medium text-accent">
          Turn this into kindling
        </AppText>
        <AppText className="mt-0.5 text-xs font-light text-foreground/55">
          Xolace+ carries today into what&apos;s next. Tap to see how.
        </AppText>
      </View>
    </PressableFeedback>
  );
};
