import { useIsFocused } from "expo-router";
import { useId } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { useLoopScale } from "@/design/motion";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export type AuraStop = { color: string; opacity: number; offset: number };

type Props = {
	width: number;
	height: number;
	stops: readonly AuraStop[];
	driftMs?: number;
	driftX?: number;
	driftY?: number;
	driftScale?: number;
	style?: StyleProp<ViewStyle>;
};

const REST = { scale: 1, translateX: 0, translateY: 0 };
const DRIFT = { ms: 12_000, scale: 1.07, x: 16, y: -12 } as const;
const ID_SEPARATORS = /:/g;

export function Aura({
	width,
	height,
	stops,
	driftMs = DRIFT.ms,
	driftX = DRIFT.x,
	driftY = DRIFT.y,
	driftScale = DRIFT.scale,
	style,
}: Props) {
	const id = useId().replace(ID_SEPARATORS, "");
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const periodMs = driftMs * useLoopScale();
	const running = focused && !reduced;
	const run = useLoopRun(running, periodMs);
	const drift = loopOrSettle({
		from: REST,
		periodMs,
		reduced,
		running,
		to: { scale: driftScale, translateX: driftX, translateY: driftY },
	});

	return (
		<EaseView
			key={run}
			pointerEvents="none"
			{...drift}
			style={[{ height, position: "absolute", width }, style]}
		>
			<Svg height={height} width={width}>
				<Defs>
					<RadialGradient cx="50%" cy="50%" id={id} rx="50%" ry="50%">
						{stops.map((s) => (
							<Stop
								key={s.offset}
								offset={s.offset}
								stopColor={s.color}
								stopOpacity={s.opacity}
							/>
						))}
					</RadialGradient>
				</Defs>
				<Ellipse
					cx={width / 2}
					cy={height / 2}
					fill={`url(#${id})`}
					rx={width / 2}
					ry={height / 2}
				/>
			</Svg>
		</EaseView>
	);
}
