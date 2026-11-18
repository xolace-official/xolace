import { View } from "react-native";
import Svg, {
	ClipPath,
	Defs,
	Line,
	Path,
	Pattern,
	Rect,
} from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/you/copy";
import { levelY, type Usual } from "@/features/you/home/week/week-model";
import { useTokenColor } from "@/lib/use-token-color";

/** The board's `.band`: it reaches 4 pt past the bars each side, radius 6, 7 pt hatching. */
const OVERHANG = 4;
const RADIUS = 6;
const HATCH = 7;
const HATCH_LINE = 2;
const HATCH_ALPHA = 0.07;
const WASH_ALPHA = 0.04;
const DASH = [4, 3];
/** "your usual" sits just above the line, at its left end. */
const LABEL_LIFT = 2;

/**
 * Your usual, behind the bars: a faint hatched band over the last four weeks' middle half, and
 * a 1 pt dashed line at their median labelled "your usual" (you.md §6). `base` is the bars'
 * baseline from the bottom of the plot.
 */
export function UsualBand({
	usual,
	width,
	base,
}: {
	usual: Usual;
	width: number;
	base: number;
}) {
	const ink = useTokenColor("foreground");
	const subtle = useTokenColor("subtle");
	const low = levelY(usual.low);
	const high = levelY(usual.high);
	const line = levelY(usual.median);
	const bandW = width + OVERHANG * 2;
	const bandH = Math.max(1, high - low);
	return (
		<>
			<Svg
				height={bandH}
				pointerEvents="none"
				style={{ bottom: base + low, left: -OVERHANG, position: "absolute" }}
				width={bandW}
			>
				<Defs>
					<ClipPath id="usual-clip">
						<Rect height={bandH} rx={RADIUS} width={bandW} />
					</ClipPath>
					<Pattern
						height={HATCH}
						id="usual-hatch"
						patternUnits="userSpaceOnUse"
						width={HATCH}
					>
						{/* The classic diagonal hatch: one stroke per tile plus its two corners, so
						    the lines run unbroken across tiles. */}
						<Path
							d={`M-1,1 l2,-2 M0,${HATCH} l${HATCH},-${HATCH} M${HATCH - 1},${HATCH + 1} l2,-2`}
							stroke={ink}
							strokeOpacity={HATCH_ALPHA}
							strokeWidth={HATCH_LINE}
						/>
					</Pattern>
				</Defs>
				<Rect
					clipPath="url(#usual-clip)"
					fill={ink}
					fillOpacity={WASH_ALPHA}
					height={bandH}
					width={bandW}
				/>
				<Rect
					clipPath="url(#usual-clip)"
					fill="url(#usual-hatch)"
					height={bandH}
					width={bandW}
				/>
			</Svg>
			<Svg
				height={1}
				pointerEvents="none"
				style={{ bottom: base + line, left: 0, position: "absolute" }}
				width={width}
			>
				<Line
					stroke={subtle}
					strokeDasharray={DASH}
					strokeWidth={1}
					x1={0}
					x2={width}
					y1={0.5}
					y2={0.5}
				/>
			</Svg>
		</>
	);
}

/** "your usual", just above the line at its left end; drawn after the bars, over them. */
export function UsualLabel({ usual, base }: { usual: Usual; base: number }) {
	return (
		<View
			pointerEvents="none"
			style={{
				bottom: base + levelY(usual.median) + LABEL_LIFT,
				left: 0,
				position: "absolute",
				zIndex: 1,
			}}
		>
			<AppText
				className="text-[9.5px] leading-3 tracking-[0.2px]"
				color="subtle"
				variant="caption"
				weight="semibold"
			>
				{COPY.week.usual}
			</AppText>
		</View>
	);
}
