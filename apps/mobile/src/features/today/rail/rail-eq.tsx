import { View } from "react-native";
import { EaseView } from "@/design/ease";
import { usePhasedBreath } from "@/design/ease-breath";
import { useTodayFrame } from "../today-frame";
import { BARS, EQ } from "./rail-model";

export function Wave({ running }: { running: boolean }) {
	return (
		<View
			className="absolute inset-x-3 bottom-3 h-7 flex-row items-end gap-[2.5px]"
			pointerEvents="none"
		>
			{BARS.map(([h, d], i) => (
				<Bar d={d} h={h} key={i} low={0.35} period={0.8} running={running} />
			))}
		</View>
	);
}

export function Meter({ running }: { running: boolean }) {
	return (
		<View
			className="absolute top-3 right-3 h-3.5 flex-row items-end gap-0.5"
			pointerEvents="none"
		>
			{EQ.map((d) => (
				<Bar
					d={d}
					h={1}
					key={d}
					low={0.35}
					period={0.6}
					running={running}
					width={3}
				/>
			))}
		</View>
	);
}

const FOOT = { x: 0.5, y: 1 };

function Bar({
	running,
	h,
	d,
	period,
	low,
	width,
}: {
	running: boolean;
	h: number;
	d: number;
	period: number;
	low: number;
	width?: number;
}) {
	const { reduced } = useTodayFrame();
	const breath = usePhasedBreath({
		from: { scaleY: low },
		mix: (k) => ({ scaleY: low + (1 - low) * k }),
		periodMs: period * 2000,
		phaseMs: -d * 1000,
		reduced,
		running,
		to: { scaleY: 1 },
	});
	return (
		<EaseView
			key={breath.key}
			{...breath.props}
			className={
				width
					? "h-3.5 rounded-[1.5px] bg-white"
					: "flex-1 rounded-[2px] bg-white/92"
			}
			onTransitionEnd={breath.onTransitionEnd}
			style={width ? { width } : { height: `${h * 100}%` }}
			transformOrigin={FOOT}
		/>
	);
}
