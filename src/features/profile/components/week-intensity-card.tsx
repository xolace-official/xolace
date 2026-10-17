import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { interpolate, interpolateColor } from "react-native-reanimated";
import { EaseView } from "react-native-ease/uniwind";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "../hooks/use-token-color";
import { GateFade } from "./gate-fade";
import { CardInfo } from "./card-info";

const INTENSITY_INFO_FREE =
  "Each bar is how heavy your moments felt that day; averaged from the intensity (1-10) of what you brought. Only this week shows in full; browsing earlier weeks is part of Xolace+.";
const INTENSITY_INFO_PLUS =
  "Each bar is how heavy your moments felt that day; averaged from the intensity (1-10) of what you brought. Use the arrows below to browse earlier weeks.";

type DayData = {
  label: string;
  dayName: string;
  intensity: number | null;
  isToday: boolean;
};

type Props = {
  days: DayData[];
  peakDay: string | null;
  hasData: boolean;
  momentsTotal: number;
  isPlus: boolean;
  weekLabel: string;
  isCurrentWeek: boolean;
  isEarliestWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onUnlock: () => void;
  onView: () => void;
  staggerDelay?: number;
};

const BAR_MAX_H = 80;
const BAR_MIN_H = 5;
const GATE_H = 64;
const CARD_INSET = 40; // card is mx-5 → 20px each side

// Height and colour are plain styles, so a bar is right on its first frame.
// They used to be Reanimated shared values springing up from the 5px floor, and
// on some TestFlight devices that spring never landed, so every bar stayed flat.
// The grow-in is now a native scaleY that ends at 1, so a missed animation still
// leaves the bar at its full height.
function IntensityBar({
  intensity,
  isToday,
  isPeak,
  accentHex,
  emberHex,
}: {
  intensity: number | null;
  isToday: boolean;
  isPeak: boolean;
  accentHex: string;
  emberHex: string;
}) {
  const reduced = useEffectiveReducedMotion();
  if (intensity === null) {
    return (
      <View
        className="rounded-md"
        style={{ height: BAR_MIN_H, backgroundColor: accentHex + "30" }}
      />
    );
  }

  const progress = intensity / 10;
  const height = interpolate(progress, [0, 1], [BAR_MIN_H, BAR_MAX_H]);
  // Low intensity → muted accent, high → ember
  const backgroundColor = interpolateColor(
    progress,
    [0, 0.5, 1],
    [accentHex + "28", accentHex + "99", emberHex],
  );

  return (
    <EaseView
      initialAnimate={{ scaleY: reduced ? 1 : 0 }}
      animate={{ scaleY: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 180 }}
      transformOrigin={{ x: 0.5, y: 1 }}
      style={{ height }}
    >
      <View
        style={[styles.bar, isToday || isPeak ? styles.barFull : styles.barDim, { backgroundColor }]}
      />
    </EaseView>
  );
}

// Frosted "earlier weeks" navigator — the single gated element (Model B). The
// current week reads free above; only the control that pages into history is
// blended behind a warm gradient fade, with no hard border. Tap → paywall.
function EarlierWeeksGate({ width, onPress }: { width: number; onPress: () => void }) {
  const accent = useTokenColor("accent");
  const muted = useTokenColor("muted");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="See earlier weeks"
      style={{ height: GATE_H }}
    >
      {/* Warm gradient veil — transparent at top (blends from the chart) into a
       * soft accent frost at the bottom. No border, no hard cutoff. */}
      <View className="absolute inset-0">
        <GateFade width={width} height={GATE_H} color={accent} endAlpha="42" />
      </View>

      {/* Dimmed navigator sitting in the frosted region. */}
      <View className="flex-1 flex-row items-center justify-center gap-2.5 opacity-50">
        <SymbolView name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }} size={11} tintColor={muted} />
        <AppText className="text-[12px] tracking-wide" style={{ color: muted }}>
          Earlier weeks
        </AppText>
        <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={11} tintColor={muted} />
      </View>
    </Pressable>
  );
}

// Real, functional week pager for Plus — same footprint as the free gate but
// unfrosted, with independently-disableable prev/next chevrons.
function WeekNav({
  weekLabel,
  canGoNext,
  canGoPrev,
  onPrevWeek,
  onNextWeek,
}: {
  weekLabel: string;
  canGoNext: boolean;
  canGoPrev: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const muted = useTokenColor("muted");
  const foreground = useTokenColor("foreground");

  return (
    <View
      className="flex-row items-center justify-center gap-4 border-t border-border/55"
      style={{ height: GATE_H }}
    >
      <PressableFeedback
        onPress={onPrevWeek}
        isDisabled={!canGoPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        hitSlop={10}
        style={canGoPrev ? styles.navChevron : styles.navChevronDisabled}
      >
        <SymbolView name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }} size={13} tintColor={muted} />
      </PressableFeedback>

      <AppText className="text-[12px] tracking-wide w-24 text-center" style={{ color: foreground }}>
        {weekLabel}
      </AppText>

      <PressableFeedback
        onPress={onNextWeek}
        isDisabled={!canGoNext}
        accessibilityRole="button"
        accessibilityLabel="Next week"
        hitSlop={10}
        style={canGoNext ? styles.navChevron : styles.navChevronDisabled}
      >
        <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={13} tintColor={muted} />
      </PressableFeedback>
    </View>
  );
}

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function WeekIntensityCard({
  days,
  peakDay,
  hasData,
  momentsTotal,
  isPlus,
  weekLabel,
  isCurrentWeek,
  isEarliestWeek,
  onPrevWeek,
  onNextWeek,
  onUnlock,
  onView,
  staggerDelay = 300,
}: Props) {
  const { width } = useWindowDimensions();
  const accentHex = useTokenColor("accent");
  const emberHex = useTokenColor("ember");
  const mutedHex = useTokenColor("muted");
  const reduced = useEffectiveReducedMotion();

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    onView();
  }, [onView]);

  const momentLabel = `${momentsTotal} ${momentsTotal === 1 ? "moment" : "moments"}`;

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: reduced ? 0 : 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 280, easing: EASE, delay: staggerDelay }}
      className="mx-5"
    >
      <View className="rounded-3xl bg-surface border border-border/65 overflow-hidden">
        <View className="px-5 pt-5 pb-4">
          <View className="flex-row items-center gap-1.5 mb-5">
            <AppText className="text-[11px] font-medium text-muted tracking-widest uppercase">
              {weekLabel}
            </AppText>
            <CardInfo
              title={weekLabel}
              description={isPlus ? INTENSITY_INFO_PLUS : INTENSITY_INFO_FREE}
            />
          </View>

          {/* Chart — always rendered (flat baseline bars when the week is empty),
           * so the card never reads as fully gated. */}
          <View className="flex-row" style={{ height: BAR_MAX_H + 20 }}>
            {/* Bars column */}
            <View className="flex-1 flex-row items-end gap-1.5">
              {days.map((d) => (
                <View key={d.dayName} className="flex-1 items-center gap-1.5">
                  <View className="flex-1 justify-end w-full">
                    <IntensityBar
                      intensity={d.intensity}
                      isToday={d.isToday}
                      isPeak={d.dayName === peakDay}
                      accentHex={accentHex}
                      emberHex={emberHex}
                    />
                  </View>
                  <AppText
                    className="text-[10px]"
                    style={{ color: d.isToday ? emberHex : mutedHex + "88" }}
                  >
                    {d.label}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Qualitative y-axis — bottom inset reserves the day-label row so
             * "Minimal" lands on the bar baseline, not the M–S row. */}
            <View className="pl-3 justify-between pb-5" style={{ height: BAR_MAX_H + 20 }}>
              {["High", "Moderate", "Mild", "Minimal"].map((lbl) => (
                <AppText
                  key={lbl}
                  className="text-[9px] font-medium text-right"
                  style={{ color: mutedHex + "85" }}
                >
                  {lbl}
                </AppText>
              ))}
            </View>
          </View>

          {hasData ? (
            peakDay && (
              <AppText className="text-xs text-muted mt-2">Intensity peaked {peakDay}</AppText>
            )
          ) : isCurrentWeek ? (
            <AppText className="text-xs text-muted mt-2 leading-5">
              {momentLabel} so far — this week&apos;s shape is still forming.
            </AppText>
          ) : (
            <AppText className="text-xs text-muted mt-2 leading-5">
              No moments logged that week.
            </AppText>
          )}
        </View>

        {isPlus ? (
          <WeekNav
            weekLabel={weekLabel}
            canGoPrev={!isEarliestWeek}
            canGoNext={!isCurrentWeek}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
          />
        ) : (
          /* The only gated element for free tier: paging into earlier weeks. */
          <EarlierWeeksGate width={width - CARD_INSET} onPress={onUnlock} />
        )}
      </View>
    </EaseView>
  );
}

const styles = StyleSheet.create({
  bar: { flex: 1, borderRadius: 8, borderCurve: "continuous" },
  barFull: { opacity: 1 },
  barDim: { opacity: 0.65 },
  navChevron: { opacity: 1 },
  navChevronDisabled: { opacity: 0.3 },
});
