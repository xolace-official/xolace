import { View } from "react-native";
import { EaseView } from "@/design/ease";
import { usePhasedBreath } from "@/design/ease-breath";
import { useReflectDraw } from "../reflect-draw";

const BARS = {
	max: 18,
	min: 5,
	ms: 900,
	offsets: [0, 0.2, 0.45, 0.1, 0.6],
} as const;
const BAR_LO = BARS.min / BARS.max;
const S = 1000;

export function LevelBars({ active }: { active: boolean }) {
	return (
		<View className="h-5 flex-row items-center gap-[3px]">
			{BARS.offsets.map((o) => (
				<LevelBar active={active} key={o} offset={o} />
			))}
		</View>
	);
}

function LevelBar({ offset, active }: { offset: number; active: boolean }) {
	const { reduced, live } = useReflectDraw();
	const breath = usePhasedBreath({
		from: { scaleY: BAR_LO },
		mix: (k) => ({ scaleY: BAR_LO + (1 - BAR_LO) * k }),
		periodMs: BARS.ms,
		phaseMs: offset * S,
		reduced,
		running: active && live,
		to: { scaleY: 1 },
	});
	return (
		<EaseView
			className="w-[3px] rounded-[2px] bg-eink"
			key={breath.key}
			onTransitionEnd={breath.onTransitionEnd}
			style={{ height: BARS.max }}
			{...breath.props}
		/>
	);
}
