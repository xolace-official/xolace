import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { usePaywall } from "@/src/features/purchases/use-paywall";

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 20, right: 20 },
});

/** 7 → "week", 14 → "2 weeks", 30 → "30 days". */
function formatWindow(days: number) {
  if (days === 7) return "week";
  if (days % 7 === 0) return `${days / 7} weeks`;
  return `${days} days`;
}

/**
 * Floating nudge shown once a free user scrolls to the end of the free-tier
 * timeline window and older sessions exist. Mirrors the teaser_viewed /
 * premium_gate_hit funnel used by other locked-insight surfaces.
 *
 * windowDays comes from the server (getTimelineWindowInfo) — never hardcode the
 * window length here, or the copy lies the next time the window is retuned.
 */
export function TimelineUpgradeBanner({ windowDays }: { windowDays: number }) {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const openPaywall = usePaywall((s) => s.open);

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    posthog.capture("teaser_viewed", { feature: "timeline_extended" });
  }, [posthog]);

  const handlePress = () => {
    posthog.capture("premium_gate_hit", { feature: "timeline_extended" });
    openPaywall("timeline_extended");
  };

  return (
    // Translate only: an animated opacity on an ancestor stops the glass blur rendering.
    <EaseView
      initialAnimate={{ translateY: 12 }}
      animate={{ translateY: 0 }}
      transition={{ type: "timing", duration: 260 }}
      style={[styles.wrapper, { bottom: insets.bottom + 12 }]}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Unlock your full timeline with Xolace+"
      >
        <GlassSurface
          radius={24}
          interactive
          className="px-5 py-4 flex-row items-center justify-between gap-3"
        >
          <View className="flex-1 gap-0.5">
            <AppText className="text-[13px] font-medium text-foreground">
              You&apos;re seeing the last {formatWindow(windowDays)}
            </AppText>
            <AppText className="text-[11px] text-foreground/55">
              Unlock your full timeline with Xolace+
            </AppText>
          </View>
          <AppText className="text-[12px] font-semibold text-accent">
            Unlock
          </AppText>
        </GlassSurface>
      </Pressable>
    </EaseView>
  );
}
