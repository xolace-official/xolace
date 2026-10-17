import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQuery } from "convex/react";
import { EaseView } from "react-native-ease/uniwind";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { HeatmapChart, buildHeatmapCalendar, type HeatmapCell } from "@/src/components/ui/heatmap-chart";
import { tap } from "@/src/lib/haptics";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { CardInfo } from "@/src/features/profile/components/card-info";
import { MIN_WEEKS, cellState, dayKeyOf, graphRange, indexHistory, parseDayKey, readout, todayIn, type IndexedHistory } from "@/src/features/profile/contribution-graph";

const GAP = 3;
const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
// Breadth is fixed, not quartile-derived: 1/2/3/4+ distinct kinds.
const LEVELS = [1, 2, 3, 4];
// Level 1 has to read as lit, not muddy, against a dark card.
const LEVEL_OPACITY = [1, 0.45, 0.65, 0.85, 1];
const GRAPH_INFO =
  "Every square is a day since you joined. The brighter it glows, the more ways you showed up. Press and hold any day to see what you did.";

/**
 * The contribution graph (#438): every day since join, shaded by breadth in
 * ember. Cell size is set so the first 16 weeks fill the card, then held — a
 * longer history scrolls back to join instead of shrinking. Hold a cell and
 * the header reads that day out.
 */
export function ContributionGraphCard({ staggerDelay = 150 }: { staggerDelay?: number }) {
  const history = useQuery(api.streaks.history.get);
  const [width, setWidth] = useState(0);
  const [heldDay, setHeldDay] = useState<string | null>(null);
  // Read by the gesture callback rather than closing over heldDay, so the
  // callback (and the chart's props) stay put while a hold drags across days.
  const holding = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const frost = useTokenColor("frost");
  const foreground = useTokenColor("foreground");

  if (!history) return null;

  const today = todayIn(history.timezone);
  const indexed = indexHistory(history, today);
  const { start, end } = graphRange(history.joinDay, today);
  const data = buildHeatmapCalendar(
    history.days.map((d) => ({ date: parseDayKey(d.dayKey), count: d.breadth })),
    { start, end },
  );
  const binSize = Math.floor((width - (MIN_WEEKS - 1) * GAP) / MIN_WEEKS);
  const summary = readout(null, indexed).value;

  const onActiveCellChange = (cell: HeatmapCell | null) => {
    if (!cell) {
      holding.current = false;
      return setHeldDay(null);
    }
    // Pre-join padding has no day: keep the last one rather than flicker.
    if (!cell.date) return;
    if (!holding.current) tap();
    holding.current = true;
    setHeldDay(dayKeyOf(cell.date));
  };

  const accessibilityLabelForDatum = (cell: HeatmapCell) => {
    if (!cell.date) return "Before you joined";
    const day = readout(dayKeyOf(cell.date), indexed);
    return `${day.value}. ${day.caption ?? ""}`;
  };

  const cellStyle = (cell: HeatmapCell) => {
    // Before join / the padding of join's first week: not part of the record.
    if (!cell.date) return { fillOpacity: 0 };
    const day = dayKeyOf(cell.date);
    const state = cellState(day, indexed);
    if (state === "future") return { fillOpacity: 0.3 };
    // Held by a freeze, not lit: a frost-blue outline around an unlit cell.
    if (state === "frozen") return { stroke: frost, strokeWidth: 1, strokeDasharray: "2,2" };
    // Today wears a ring, lit or not yet.
    if (day === today) return { stroke: foreground, strokeWidth: 1 };
    return undefined;
  };

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300, easing: EASE, delay: staggerDelay }}
      className="px-5 mt-4"
    >
      <View className="rounded-3xl bg-surface border border-border/65 p-4">
        <HeldReadout dayKey={heldDay} indexed={indexed} />

        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {binSize > 0 && (
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              <HeatmapChart
                className="w-auto"
                data={data}
                binSize={binSize}
                gap={GAP}
                cornerRadius={3}
                levels={LEVELS}
                color="--color-ember"
                emptyColor="--color-separator"
                levelOpacity={LEVEL_OPACITY}
                inactiveOpacity={0.45}
                onActiveCellChange={onActiveCellChange}
                accessibilityLabel={`Contribution graph. ${summary}.`}
                accessibilityLabelForDatum={accessibilityLabelForDatum}
              >
                <HeatmapChart.XAxis />
                <HeatmapChart.Cells cellStyle={cellStyle} />
                {/* The gesture only — the readout lives in the header above. */}
                <HeatmapChart.Tooltip formatLabel={() => ""} />
              </HeatmapChart>
            </ScrollView>
          )}
        </View>
      </View>
    </EaseView>
  );
}

/**
 * The header, split out so only it re-renders as a hold moves between days —
 * in the card, `readout(heldDay, indexed)` tied every derived prop to heldDay.
 */
function HeldReadout({ dayKey, indexed }: { dayKey: string | null; indexed: IndexedHistory }) {
  const { value, caption } = readout(dayKey, indexed);
  return (
    <View className="mb-3 min-h-10">
      <AppText className="text-[17px] font-bold tracking-tight text-foreground">{value}</AppText>
      {caption ? (
        <AppText className="text-[12px] text-muted mt-0.5">{caption}</AppText>
      ) : (
        // At rest the caption slot carries the hold hint, so nothing shifts when a day is held.
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <CardInfo title="Your days" description={GRAPH_INFO} />
          <AppText className="text-[11px] text-muted">Hold on any day to see the details</AppText>
        </View>
      )}
    </View>
  );
}
