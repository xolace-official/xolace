import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { playSoftPress } from "@/src/lib/haptics";
import { posthog } from "@/src/config/posthog";
import { useAppStore } from "@/src/store/store";
import type { StarterRow } from "@/src/features/starter-suggestions/starter-rows";
import { orderStarterRows, type Intake } from "@/src/features/starter-suggestions/order-starter-rows";

const FLUX = require("@/assets/images/flux/flux-map.png");
const FLUX_W = 72;
const FLUX_H = 96;
const FLUX_STYLE = { width: FLUX_W, height: FLUX_H };
// The tail sits over Flux's head; bubble and Flux share the same left edge.
const TAIL_LEFT = FLUX_W / 2 - 7;
// Per-tap token for /connect; module-level so the purity lint sees no render-time clock.
const navToken = () => String(Date.now());
const EASING = [0.23, 1, 0.32, 1] as [number, number, number, number];

type Props = {
  /** `getFullContext().intake`; null when intake was skipped. Orders the rows only (ADR-0017). */
  intake: Intake | null | undefined;
  onResolve: () => void;
};

/** Starter suggestions (#460): Flux, bottom-left, speaking a one-time offer of places to begin. */
export function StarterSuggestionsBubble({ intake, onResolve }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useEffectiveReducedMotion();
  const [muted, accent] = useThemeColor(["muted", "accent"]);
  const requestComposerOpen = useAppStore((s) => s.requestComposerOpen);

  // Mounted only while eligible, so ineligible users never fire anything (#463).
  const shownCaptured = useRef(false);
  useEffect(() => {
    if (shownCaptured.current) return;
    shownCaptured.current = true;
    posthog.capture("starter_suggestions_shown");
  }, []);

  // One resolve per showing, even if a second tap lands before the unmount.
  const resolved = useRef(false);
  const resolve = (event: string, props: Record<string, string | number>) => {
    if (resolved.current) return false;
    resolved.current = true;
    posthog.capture(event, props);
    onResolve();
    return true;
  };
  const dismiss = (via: "close" | "tap_away") => resolve("starter_suggestions_dismissed", { via });

  const choose = (row: StarterRow, index: number) => {
    if (!resolve("starter_suggestion_tapped", { row: row.id, position: index + 1 })) return;
    playSoftPress();
    // Reflect is the screen under the bubble: ask it to open the card (#462).
    // Tab destinations replace, like the idle menu's Discovery, so reflect
    // stays the "/" landing with no back stack.
    if (row.id === "reflect") requestComposerOpen();
    else if (row.id === "vent") router.push("/(protected)/voice-vent");
    else if (row.id === "lantern") router.replace("/browse/library", { withAnchor: true });
    else if (row.id === "listen") router.replace("/browse");
    // The roster, not a conversation: the request (and its "Before you ask"
    // primer) stays the user's own tap. `t` re-applies the segment if the
    // tab is already mounted on Chats.
    else if (row.id === "xolacer")
      router.replace({ pathname: "/connect", params: { view: "xolacers", t: navToken() } });
  };

  const fluxBottom = insets.bottom + 16;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
      <EaseView
        initialAnimate={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: reduceMotion ? 0 : 200 }}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        {/* Tap-away closes, same as ✕. Screen readers use ✕ instead. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss("tap_away")} accessible={false} />
      </EaseView>

      {/* Flux arrives first, then speaks. */}
      <EaseView
        initialAnimate={{ opacity: 0, translateY: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: reduceMotion ? 150 : 280, easing: EASING }}
        className="absolute left-5"
        style={{ bottom: fluxBottom }}
        pointerEvents="none"
      >
        <View className="absolute -inset-3 rounded-full bg-accent/15" />
        <Image source={FLUX} style={FLUX_STYLE} contentFit="contain" accessible={false} />
      </EaseView>

      <EaseView
        initialAnimate={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "timing",
          duration: reduceMotion ? 150 : 260,
          delay: reduceMotion ? 0 : 140,
          easing: EASING,
        }}
        transformOrigin={{ x: 0.1, y: 1 }}
        className="absolute left-5 w-[76%] max-w-[320px]"
        style={{ bottom: fluxBottom + FLUX_H + 10 }}
      >
        <View className="rounded-3xl bg-surface pt-3 pb-1 shadow-lg">
          <View className="flex-row items-start pl-4 pr-2">
            <View className="flex-1 pt-1" accessibilityRole="header">
              <AppText className="text-[15px] font-semibold text-foreground">
                Where would you like to start?
              </AppText>
              <AppText className="text-xs text-muted">Suggested for you</AppText>
            </View>
            <PressableFeedback
              onPress={() => dismiss("close")}
              accessibilityRole="button"
              accessibilityLabel="Close suggestions"
              hitSlop={8}
              className="p-2"
            >
              <SymbolView name={{ ios: "xmark", android: "close" } as any} size={14} tintColor={muted} />
            </PressableFeedback>
          </View>

          <View className="mt-1">
            {orderStarterRows(intake).map((row, i) => (
              <PressableFeedback
                key={row.id}
                onPress={() => choose(row, i)}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}. ${row.subtitle}`}
              >
                <View
                  className={cn("mx-4 flex-row items-center gap-3 py-2.5", i > 0 && "border-t border-border/50")}
                >
                  <View className="size-9 items-center justify-center rounded-xl bg-accent/10">
                    <SymbolView name={row.icon as any} size={17} tintColor={accent} />
                  </View>
                  <AppText className="flex-1 text-sm text-muted" numberOfLines={2}>
                    <AppText className="text-sm font-semibold text-foreground">{row.title}</AppText>
                    {`  ${row.subtitle}`}
                  </AppText>
                  <SymbolView
                    name={{ ios: "arrow.right", android: "arrow_forward" } as any}
                    size={13}
                    tintColor={muted}
                  />
                </View>
              </PressableFeedback>
            ))}
          </View>
        </View>

        {/* Speech tail, pointing down at Flux. */}
        <View
          className="absolute -bottom-1.5 size-3.5 rotate-45 rounded-sm bg-surface"
          style={{ left: TAIL_LEFT }}
        />
      </EaseView>
    </View>
  );
}
