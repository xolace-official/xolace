/**
 * Orchestrator: renders the always-visible mini card in the header
 * and, when the streak has increased past the last acknowledged day,
 * measures the mini card and mounts the reveal overlay via Portal.
 *
 * While a streak saver can undo a break (#437) the mini shows the prior count
 * dimmed with a "Tap to rekindle" chip — the only prompt for a revive. With no
 * offer (no saver, or the window closed) the card just reads the reset.
 */
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useIsFocused } from "expo-router/react-navigation";
import { useMutation } from "convex/react";
import { Portal, PressableFeedback, useThemeColor } from "heroui-native";
import Animated, {
  measure,
  runOnUI,
  useAnimatedRef,
  useReducedMotion,
  type MeasuredDimensions,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import { useAppStore } from "@/src/store/store";
import { posthog } from "@/src/config/posthog";
import { shouldShowReflectTour } from "@/src/features/reflect/tour-copy";
import {
  getCardMetrics,
  MINI_SIZE,
  REVEAL_START_DELAY_MS,
  type CardColors,
} from "./constants";
import { RekindleSheet } from "./rekindle-sheet";
import { RevealOverlay } from "./reveal-overlay";
import { StreakFlipCard } from "./streak-flip-card";

const MINI_METRICS = getCardMetrics(MINI_SIZE);
const miniCardStyle = { width: MINI_SIZE };

type Props = {
  currentStreak: number;
  /** The count a streak saver would restore, while a revive is on offer. */
  reviveStreak?: number;
};

export const StreakCalendar = ({ currentStreak, reviveStreak }: Props) => {
  const lastAcknowledgedStreak = useAppStore((s) => s.lastAcknowledgedStreak);
  const setLastAcknowledgedStreak = useAppStore(
    (s) => s.setLastAcknowledgedStreak,
  );
  const reducedMotion = useReducedMotion();
  // The reflect screen stays mounted under pushed screens, and the
  // reveal renders via Portal above everything — so without this gate
  // a streak update would play the reveal on top of whatever screen
  // the user is on. Wait until this screen is focused again.
  const isFocused = useIsFocused();
  // Waits for any home sheet and the first-run tour so they never stack (#460).
  // Not homeSheetBlocking: that stays up through a follow-up's whole pending wait.
  const homeSheetOpen = useAppStore((s) => s.homeSheetOpen);
  const tourPending = useAppStore((s) => shouldShowReflectTour(s.reflectTourVersion));

  const headerColor = useThemeColor("accent") as string;
  const headerTextColor = useThemeColor("accent-foreground") as string;
  const bodyColor = useThemeColor("surface") as string;
  const numberColor = useThemeColor("foreground") as string;

  const colors: CardColors = {
    header: headerColor,
    headerText: headerTextColor,
    body: bodyColor,
    number: numberColor,
  };

  const miniRef = useAnimatedRef<Animated.View>();
  const [miniLayout, setMiniLayout] = useState<MeasuredDimensions | null>(null);

  const revive = useMutation(api.streaks.revive.revive);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The query doesn't re-run when the window closes at midnight, so a revive
  // the server turns down hides the offer it was made from — silently.
  const [expiredOffer, setExpiredOffer] = useState<number>();
  // Re-arm once the query drops the offer, so a later break's revive at the
  // same count still shows.
  if (reviveStreak === undefined && expiredOffer !== undefined) setExpiredOffer(undefined);
  const offer = reviveStreak !== expiredOffer ? reviveStreak : undefined;

  const handleRekindle = async () => {
    setSheetOpen(false);
    try {
      const day = await revive();
      posthog.capture("streak_rekindled", { day });
    } catch (error) {
      // Anything else (offline, a server hiccup) leaves the chip up to retry.
      if ((error as { data?: { code?: string } }).data?.code === "no_revive_available") {
        setExpiredOffer(offer);
      }
    }
  };

  // The rekindled count plays the reveal once the offer is gone.
  const revealPending =
    offer === undefined && currentStreak > lastAcknowledgedStreak && currentStreak > 0;
  const revealing = miniLayout !== null;

  useEffect(() => {
    // Streak reset (or first sync after install) — acknowledge silently
    if (currentStreak < lastAcknowledgedStreak) {
      setLastAcknowledgedStreak(currentStreak);
      return;
    }
    if (!revealPending || revealing || !isFocused || homeSheetOpen || tourPending) return;

    // Reduced motion: skip the reveal entirely, just update the number
    if (reducedMotion) {
      setLastAcknowledgedStreak(currentStreak);
      return;
    }

    const timer = setTimeout(() => {
      runOnUI(() => {
        "worklet";
        const layout = measure(miniRef);
        // A null measure means the reveal cannot be staged, and nothing
        // retries. Acknowledge the streak anyway — the mini deliberately shows
        // a day behind while a reveal is pending, so without this it sits one
        // short forever. A missed animation beats a wrong number.
        // Acknowledge as it goes up either way: once seen it's delivered, so a
        // kill mid-reveal never replays it.
        scheduleOnRN(setLastAcknowledgedStreak, currentStreak);
        if (layout !== null) scheduleOnRN(setMiniLayout, layout);
      })();
    }, REVEAL_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    currentStreak,
    lastAcknowledgedStreak,
    revealPending,
    revealing,
    reducedMotion,
    isFocused,
    homeSheetOpen,
    tourPending,
    miniRef,
    setLastAcknowledgedStreak,
  ]);

  const handleDismissed = () => {
    setMiniLayout(null);
    posthog.capture("streak_reveal_acknowledged", { day: currentStreak });
  };

  // While a reveal is pending/running, the mini shows the old number
  const miniDay = revealPending ? Math.max(currentStreak - 1, 0) : currentStreak;

  if (offer !== undefined) {
    return (
      <>
        <PressableFeedback
          onPress={() => {
            playSoftPress();
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${offer}-day streak went quiet. Tap to rekindle`}
          className="flex-row items-center gap-2"
        >
          <View className="opacity-40" style={miniCardStyle}>
            <StreakFlipCard day={offer} metrics={MINI_METRICS} colors={colors} />
          </View>
          <View className="rounded-full bg-accent/15 px-3 py-1">
            <AppText className="text-xs font-semibold text-accent">Tap to rekindle</AppText>
          </View>
        </PressableFeedback>
        <RekindleSheet
          isOpen={sheetOpen}
          streak={offer}
          onRekindle={handleRekindle}
          onClose={() => setSheetOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Animated.View
        ref={miniRef}
        className={revealing ? "opacity-0" : "opacity-100"}
        style={miniCardStyle}
      >
        <StreakFlipCard day={miniDay} metrics={MINI_METRICS} colors={colors} />
      </Animated.View>

      {revealing && (
        <Portal name="streak-reveal">
          <RevealOverlay
            day={currentStreak}
            miniLayout={miniLayout}
            colors={colors}
            onDismissed={handleDismissed}
          />
        </Portal>
      )}
    </>
  );
};
