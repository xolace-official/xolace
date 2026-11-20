import {
	BlurMask,
	Canvas,
	Circle,
	DashPathEffect,
	Group,
	Path,
	type SkPath,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { keyframes } from "@/design/keyframes";
import { easeInOutFn, seg, trimFn } from "../today-motion";
import { alongX, alongY, type PathGeometry } from "./kindling-geometry";
import { BEAT, PAD, PATH_H, STROKE, WISP } from "./kindling-model";
import { KindlingNode, type NodeColours } from "./kindling-node";
import { Stretch } from "./kindling-stretch";
import { Wisp } from "./kindling-wisp";

const SHIFT = [{ translateX: PAD }, { translateY: PAD }];

type Props = {
	geo: PathGeometry;
	width: number;
	done: readonly boolean[];
	current: number;
	justDone: number;
	beat: SharedValue<number>;
	clock: SharedValue<number>;
	dash: string;
	colours: NodeColours;
	low: boolean;
};

export function KindlingPath({
	geo,
	width,
	done,
	current,
	justDone,
	beat,
	clock,
	dash,
	colours,
	low,
}: Props) {
	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: PATH_H + PAD * 2,
				left: -PAD,
				position: "absolute",
				top: -PAD,
				width: width + PAD * 2,
			}}
		>
			<Group transform={SHIFT}>
				{geo.paths.map((p, j) => (
					<Path
						color={dash}
						key={`d${j}`}
						opacity={STROKE.dash.opacity}
						path={p}
						strokeCap="round"
						strokeWidth={STROKE.dash.width}
						style="stroke"
					>
						<DashPathEffect intervals={[...STROKE.dash.intervals]} />
					</Path>
				))}
				{geo.paths.map((p, j) => (
					<Stretch
						beat={beat}
						clock={clock}
						drawing={j === justDone}
						ember={colours.ember}
						key={`s${j}:${done[j] ?? false}:${j === justDone}`}
						len={geo.tables[j]?.len ?? 1}
						lit={done[j] ?? false}
						low={low}
						path={p}
					/>
				))}
				{geo.nodes.map(([x, y], i) => {
					const state = done[i]
						? "done"
						: i === current
							? "current"
							: "waiting";
					const popping = i === justDone;
					const arriving = justDone >= 0 && i === justDone + 1 && i === current;
					return (
						<KindlingNode
							arriving={arriving}
							beat={beat}
							c={colours}
							clock={clock}
							key={`${i}:${state}:${popping}:${arriving}`}
							popping={popping}
							state={state}
							x={x}
							y={y}
						/>
					);
				})}
				{justDone >= 0 && justDone < geo.paths.length ? (
					<Wisp beat={beat} geo={geo} low={low} seg={justDone} />
				) : null}
			</Group>
		</Canvas>
	);
}
