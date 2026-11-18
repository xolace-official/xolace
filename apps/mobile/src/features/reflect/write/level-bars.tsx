import { View } from "react-native";
import { EaseView } from "@/design/ease";
import { usePhasedBreath } from "@/design/ease-breath";
import { useReflectDraw } from "../reflect-draw";

/** Board `.bars`: five bars, 5 ↔ 18 pt over .9 s, each at its own offset. */
const BARS = {
	max: 18,
	min: 5,
	ms: 900,
	offsets: [0, 0.2, 0.45, 0.1, 0.6],
} as const;
const BAR_LO = BARS.min / BARS.max;
const S = 1000;

/**
 * The listening pill's level: no live voice level reaches the screen, so the bars breathe at
 * rest while listening rather than following the voice.
 */
export function LevelBars({ active }: { active: boolean }) {
	return (
		<View className="h-5 flex-row items-center gap-[3px]">
			{BARS.offsets.map((o) => (
				<LevelBar active={active} key={o} offset={o} />
			))}
		</View>
	);
}

/**
 * 5 → 18 → 5 per .9 s on a sine, each bar from its own offset (a CSS negative delay): a native
 * loop that first plays the rest of its current half. Reduced: still at 5.
 */
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
