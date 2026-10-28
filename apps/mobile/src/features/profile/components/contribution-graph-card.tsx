import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Surface } from "heroui-native";
import { useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { ScrollView, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import {
	buildHeatmapCalendar,
	type HeatmapCell,
	HeatmapChart,
} from "@/components/ui/heatmap-chart";
import { CardInfo } from "@/features/profile/components/card-info";
import {
	cellState,
	dayKeyOf,
	graphRange,
	type IndexedHistory,
	indexHistory,
	MIN_WEEKS,
	parseDayKey,
	readout,
	todayIn,
} from "@/features/profile/contribution-graph";
import { tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const GAP = 3;
const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
// Breadth is fixed, not quartile-derived: 1/2/3/4+ distinct kinds.
const LEVELS = [1, 2, 3, 4];
// Level 1 has to read as lit, not muddy, against a dark card.
const LEVEL_OPACITY = [1, 0.45, 0.65, 0.85, 1];
const GRAPH_INFO =
	"Every square is a day since you joined. The brighter it glows, the more ways you showed up. Press and hold any day to see what you did.";

/** The contribution graph (#438): every day since join, shaded by breadth. Cell
 * size fills the first 16 weeks, then holds; longer histories scroll back to join. */
export function ContributionGraphCard({
	staggerDelay = 150,
}: {
	staggerDelay?: number;
}) {
	const history = useQuery(api.streaks.history.get);
	const [width, setWidth] = useState(0);
	const [heldDay, setHeldDay] = useState<string | null>(null);
	// Read by the gesture callback rather than closed over, so the callback and
	// the chart's props stay put while a hold drags across days.
	const holding = useRef(false);
	const scrollRef = useRef<ScrollViewInstance>(null);
	const frost = useTokenColor("frost");
	const foreground = useTokenColor("foreground");

	if (!history) {
		return null;
	}

	const today = todayIn(history.timezone);
	const indexed = indexHistory(history, today);
	const { start, end } = graphRange(history.joinDay, today);
	const data = buildHeatmapCalendar(
		history.days.map((d) => ({
			count: d.breadth,
			date: parseDayKey(d.dayKey),
		})),
		{ end, start }
	);
	const binSize = Math.floor((width - (MIN_WEEKS - 1) * GAP) / MIN_WEEKS);
	const summary = readout(null, indexed).value;

	const onActiveCellChange = (cell: HeatmapCell | null) => {
		if (!cell) {
			holding.current = false;
			return setHeldDay(null);
		}
		// Pre-join padding has no day: keep the last one rather than flicker.
		if (!cell.date) {
			return;
		}
		if (!holding.current) {
			tap();
		}
		holding.current = true;
		setHeldDay(dayKeyOf(cell.date));
	};

	const accessibilityLabelForDatum = (cell: HeatmapCell) => {
		if (!cell.date) {
			return "Before you joined";
		}
		const day = readout(dayKeyOf(cell.date), indexed);
		return `${day.value}. ${day.caption ?? ""}`;
	};

	const cellStyle = (cell: HeatmapCell) => {
		// Before join / the padding of join's first week: not part of the record.
		if (!cell.date) {
			return { fillOpacity: 0 };
		}
		const day = dayKeyOf(cell.date);
		const state = cellState(day, indexed);
		if (state === "future") {
			return { fillOpacity: 0.3 };
		}
		// Held by a freeze, not lit: a frost-blue outline around an unlit cell.
		if (state === "frozen") {
			return { stroke: frost, strokeDasharray: "2,2", strokeWidth: 1 };
		}
		// Today wears a ring, lit or not yet.
		if (day === today) {
			return { stroke: foreground, strokeWidth: 1 };
		}
	};

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className="mt-4 px-5"
			initialAnimate={{ opacity: 0, translateY: 8 }}
			transition={{
				delay: staggerDelay,
				duration: 300,
				easing: EASE,
				type: "timing",
			}}
		>
			<Surface className="p-4">
				<HeldReadout dayKey={heldDay} indexed={indexed} />

				<View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
					{binSize > 0 && (
						<ScrollView
							horizontal
							onContentSizeChange={() =>
								scrollRef.current?.scrollToEnd({ animated: false })
							}
							ref={scrollRef}
							showsHorizontalScrollIndicator={false}
						>
							<HeatmapChart
								accessibilityLabel={`Contribution graph. ${summary}.`}
								accessibilityLabelForDatum={accessibilityLabelForDatum}
								binSize={binSize}
								className="w-auto"
								color="--color-ember"
								cornerRadius={3}
								data={data}
								emptyColor="--color-separator"
								gap={GAP}
								inactiveOpacity={0.45}
								levelOpacity={LEVEL_OPACITY}
								levels={LEVELS}
								onActiveCellChange={onActiveCellChange}
							>
								<HeatmapChart.XAxis />
								<HeatmapChart.Cells cellStyle={cellStyle} />
								{/* The gesture only — the readout lives in the header above. */}
								<HeatmapChart.Tooltip formatLabel={() => ""} />
							</HeatmapChart>
						</ScrollView>
					)}
				</View>
			</Surface>
		</EaseView>
	);
}

/** Split out so only the header re-renders as a hold moves between days. */
function HeldReadout({
	dayKey,
	indexed,
}: {
	dayKey: string | null;
	indexed: IndexedHistory;
}) {
	const { value, caption } = readout(dayKey, indexed);
	return (
		<View className="mb-3 min-h-10">
			<AppText className="font-bold text-[17px] text-foreground tracking-tight">
				{value}
			</AppText>
			{caption ? (
				<AppText className="mt-0.5 text-[12px] text-muted">{caption}</AppText>
			) : (
				// At rest the caption slot carries the hold hint, so nothing shifts when a day
				// is held.
				<View className="mt-0.5 flex-row items-center gap-1.5">
					<CardInfo description={GRAPH_INFO} title="Your days" />
					<AppText className="text-[11px] text-muted">
						Hold on any day to see the details
					</AppText>
				</View>
			)}
		</View>
	);
}
