import { useRef, useState } from "react";
import { ScrollView, type ScrollViewInstance, View } from "react-native";
import {
	buildHeatmapCalendar,
	type HeatmapCell,
	HeatmapChart,
} from "@/components/ui/heatmap-chart";
import { COPY } from "@/features/you/copy";
import {
	cellState,
	dayKeyOf,
	graphRange,
	type IndexedHistory,
	MIN_WEEKS,
	parseDayKey,
	readout,
	WEEK_START_DAY,
	weekOf,
} from "@/features/you/home/days-model";
import { DaysReadout } from "@/features/you/home/insights/days-readout";
import { useYouUi } from "@/features/you/home/you-ui";
import { InfoTip } from "@/features/you/info-tip";
import { Surface } from "@/features/you/surface";
import { tap } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";

const GAP = 3;
const RADIUS = 3.5;
// Breadth is fixed, not quartile-derived: 1/2/3/4+ distinct kinds.
const LEVELS = [1, 2, 3, 4];
// Level 1 has to read as lit, not muddy, against a dark card.
const LEVEL_OPACITY = [1, 0.45, 0.65, 0.85, 1];
const INACTIVE = 0.45;
/** While the week is ringed, the other days step back to this. */
const WEEK_DIM = 0.5;
const FUTURE = 0.3;
const RING_WIDTH = 1.5;
/** The ⓘ's explanation sits under the readout. */
const TIP_TOP = 64;

/**
 * Production's Your days (contribution-graph-card.tsx), unchanged in what it shows: the
 * readout, the hold, frozen and today cells, 16 weeks filling the width, scrolling back to the
 * join day, month labels along the top. Tapping the header's week rings this week's column.
 */
export function DaysCard({ history }: { history: IndexedHistory }) {
	const { weekRing } = useYouUi();
	const [width, setWidth] = useState(0);
	const [heldDay, setHeldDay] = useState<string | null>(null);
	const [info, setInfo] = useState(false);
	// Read by the gesture callback rather than closed over, so the callback and the chart's
	// props stay put while a hold drags across days.
	const holding = useRef(false);
	const scrollRef = useRef<ScrollViewInstance>(null);
	const [frost = "", foreground = "", accent = ""] = useTokenColors([
		"frost",
		"foreground",
		"accent",
	]);

	const { start, end } = graphRange(history.joinDay, history.today);
	const data = buildHeatmapCalendar(
		[...history.byDay.values()].map((d) => ({
			count: d.breadth,
			date: parseDayKey(d.dayKey),
		})),
		{ end, start, weekStartDay: WEEK_START_DAY }
	);
	const week = new Set(weekOf(history.today));
	const binSize = Math.floor((width - (MIN_WEEKS - 1) * GAP) / MIN_WEEKS);
	const summary = readout(null, history).value;

	const onActiveCellChange = (cell: HeatmapCell | null) => {
		if (!cell) {
			holding.current = false;
			setHeldDay(null);
			return;
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

	const labelFor = (cell: HeatmapCell) => {
		if (!cell.date) {
			return COPY.days.beforeJoin;
		}
		const day = readout(dayKeyOf(cell.date), history);
		return `${day.value}. ${day.caption ?? ""}`;
	};

	const cellStyle = (cell: HeatmapCell) => {
		// Before join / the padding of join's first week: not part of the record.
		if (!cell.date) {
			return { fillOpacity: 0 };
		}
		const day = dayKeyOf(cell.date);
		if (weekRing) {
			if (week.has(day)) {
				return { stroke: accent, strokeWidth: RING_WIDTH };
			}
			const breadth = history.byDay.get(day)?.breadth ?? 0;
			const level = Math.min(breadth, LEVELS.length);
			return { fillOpacity: (LEVEL_OPACITY[level] ?? 1) * WEEK_DIM };
		}
		const state = cellState(day, history);
		if (state === "future") {
			return { fillOpacity: FUTURE };
		}
		// Held by a freeze, not lit: a frost outline round an unlit cell.
		if (state === "frozen") {
			return { stroke: frost, strokeDasharray: "2,2", strokeWidth: 1 };
		}
		// Today wears a ring, lit or not yet.
		if (day === history.today) {
			return { stroke: foreground, strokeWidth: 1 };
		}
	};

	return (
		<Surface className="p-4">
			<DaysReadout
				dayKey={heldDay}
				history={history}
				onInfo={() => setInfo((v) => !v)}
			/>
			<View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
				{binSize > 0 ? (
					<ScrollView
						horizontal
						onContentSizeChange={() =>
							scrollRef.current?.scrollToEnd({ animated: false })
						}
						ref={scrollRef}
						showsHorizontalScrollIndicator={false}
					>
						<HeatmapChart
							accessibilityLabel={COPY.days.graph(summary)}
							accessibilityLabelForDatum={labelFor}
							binSize={binSize}
							className="w-auto"
							color="--color-ember"
							cornerRadius={RADIUS}
							data={data}
							emptyColor="--color-separator"
							gap={GAP}
							inactiveOpacity={INACTIVE}
							levelOpacity={LEVEL_OPACITY}
							levels={LEVELS}
							onActiveCellChange={onActiveCellChange}
							weekStartDay={WEEK_START_DAY}
						>
							<HeatmapChart.XAxis />
							<HeatmapChart.Cells cellStyle={cellStyle} />
							{/* The gesture only: the readout lives above. */}
							<HeatmapChart.Tooltip formatLabel={() => ""} />
						</HeatmapChart>
					</ScrollView>
				) : null}
			</View>
			{info ? (
				<InfoTip
					body={COPY.days.info}
					onClose={() => setInfo(false)}
					title={COPY.days.title}
					top={TIP_TOP}
				/>
			) : null}
		</Surface>
	);
}
