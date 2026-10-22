/**
 * The desk-calendar card. Renders at whatever size `metrics` describes.
 *
 * Static mode (mini in header): both halves show the same day — plain
 * Views, no shared values, no animation cost on the idle screen.
 * Flip mode (reveal overlay): pass `flipProgress` + `previousDay` and a
 * FlipPage animates old day → new day.
 */
import { StyleSheet, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import type { SharedValue } from "react-native-reanimated";

import { AppText } from "@/src/components/shared/app-text";
import type { CardColors, CardMetrics } from "./constants";
import { FlipPage } from "./flip-page";

type StaticHalfProps = {
  day: number;
  position: "top" | "bottom";
  metrics: CardMetrics;
  colors: CardColors;
};

const StaticHalf = ({ day, position, metrics, colors }: StaticHalfProps) => {
  const isTop = position === "top";

  return (
    <View
      style={[
        styles.half,
        // eslint-disable-next-line react-native/no-inline-styles
        {
          backgroundColor: colors.body,
          height: metrics.pageSize,
          width: metrics.size,
          top: isTop ? 0 : metrics.pageSize,
        },
        !isTop && {
          borderBottomLeftRadius: metrics.innerRadius,
          borderBottomRightRadius: metrics.innerRadius,
        },
      ]}
    >
      {isTop ? (
        <>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.03)"]}
            style={styles.topGradient}
          />
          <View style={styles.dividerLine} />
        </>
      ) : (
        <LinearGradient
          colors={["rgba(0,0,0,0.04)", "transparent"]}
          style={styles.bottomGradient}
        />
      )}
      <View
        style={[
          styles.numberContainer,
          {
            height: metrics.bodyHeight,
            transform: [
              {
                translateY: isTop ? metrics.pageSize / 2 : -metrics.pageSize / 2,
              },
            ],
          },
        ]}
      >
        <AppText
          className="font-bold"
          style={[
            styles.numberText,
            { fontSize: metrics.numberFontSize, color: colors.number },
          ]}
        >
          {day}
        </AppText>
      </View>
    </View>
  );
};

type StreakFlipCardProps = {
  /** The (new) day shown on the card */
  day: number;
  /** Old day — required for flip mode */
  previousDay?: number;
  /** When provided, the card renders the animated flip page */
  flipProgress?: SharedValue<number>;
  metrics: CardMetrics;
  colors: CardColors;
};

export const StreakFlipCard = ({
  day,
  previousDay,
  flipProgress,
  metrics,
  colors,
}: StreakFlipCardProps) => {
  const flipping = flipProgress !== undefined && previousDay !== undefined;

  return (
    <View
      style={[
        styles.cardShadow,
        { borderRadius: metrics.outerRadius, width: metrics.size },
      ]}
    >
      <View
        style={[
          styles.headerStrip,
          {
            backgroundColor: colors.header,
            borderTopLeftRadius: metrics.outerRadius,
            borderTopRightRadius: metrics.outerRadius,
            height: metrics.headerHeight,
            width: metrics.size,
          },
        ]}
      >
        <AppText
          className="font-semibold"
          style={{
            color: colors.headerText,
            fontSize: metrics.headerFontSize,
            letterSpacing: metrics.headerFontSize * 0.15,
          }}
        >
          DAY
        </AppText>
      </View>

      <View
        style={[
          styles.bodyContainer,
          {
            backgroundColor: colors.body,
            borderBottomLeftRadius: metrics.innerRadius,
            borderBottomRightRadius: metrics.innerRadius,
            height: metrics.bodyHeight,
            width: metrics.size,
          },
        ]}
      >
        <StaticHalf
          day={flipping ? previousDay : day}
          position="top"
          metrics={metrics}
          colors={colors}
        />
        <StaticHalf
          day={day}
          position="bottom"
          metrics={metrics}
          colors={colors}
        />
        {flipping && (
          <FlipPage
            flipProgress={flipProgress}
            frontDay={previousDay}
            backDay={day}
            metrics={metrics}
            colors={colors}
          />
        )}
      </View>
    </View>
  );
};

const DIVIDER_BG = "rgba(0,0,0,0.08)";

const styles = StyleSheet.create({
  bodyContainer: {
    borderCurve: "continuous",
  },
  headerStrip: {
    alignItems: "center",
    borderCurve: "continuous",
    justifyContent: "center",
  },
  numberContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
  },
  bottomGradient: {
    height: 15,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 9,
  },
  cardShadow: {
    borderCurve: "continuous",
    boxShadow: "0px 0px 20px rgba(0, 0, 0, 0.1)",
  },
  dividerLine: {
    backgroundColor: DIVIDER_BG,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 10,
  },
  half: {
    alignItems: "center",
    borderCurve: "continuous",
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
  },
  topGradient: {
    bottom: 0,
    height: 15,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 9,
  },
});
