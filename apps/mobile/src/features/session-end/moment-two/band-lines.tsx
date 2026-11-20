import {
	BlurMask,
	Circle,
	DashPathEffect,
	Path,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { EASE } from "../session-look";
import { clamp01 } from "../timeline";
import { DRAW, LINES, lineAt, YOU } from "./band-geo";

export function BandLine({
	k,
	color,
	cs,
	reduced,
}: {
	k: number;
	color: string;
	cs: SharedValue<number>;
	reduced: boolean;
}) {
	const at = useDerivedValue(() => lineAt(cs.get(), k, reduced));
	const end = useDerivedValue(() => at.get()[0]);
	const glowA = useDerivedValue(() => at.get()[1] * DRAW.line.glowA);
	const coreA = useDerivedValue(() => at.get()[1] * DRAW.line.coreA);
	return (
		<>
			<Path
				color={color}
				end={end}
				opacity={glowA}
				path={LINES[k]}
				strokeCap="round"
				strokeWidth={DRAW.line.glowW}
				style="stroke"
			>
				<BlurMask blur={DRAW.line.glowBlur} style="normal" />
			</Path>
			<Path
				color={color}
				end={end}
				opacity={coreA}
				path={LINES[k]}
				strokeCap="round"
				strokeWidth={DRAW.line.coreW}
				style="stroke"
			/>
		</>
	);
}

export function BandSlot({
	warmColor,
	ink3,
	c2,
	warm,
	gone,
	reduced,
}: {
	warmColor: string;
	ink3: string;
	c2: SharedValue<number>;
	warm: SharedValue<number>;
	gone: SharedValue<number>;
	reduced: boolean;
}) {
	const S = DRAW.slot;
	const inA = useDerivedValue(() => {
		const c = c2.get();
		return reduced
			? clamp01((c - 600) / 200)
			: EASE.css(clamp01((c - 600) / 600));
	});
	const coolA = useDerivedValue(
		() => inA.get() * S.alpha * (1 - warm.get()) * (1 - gone.get())
	);
	const warmA = useDerivedValue(
		() => inA.get() * warm.get() * (1 - gone.get())
	);
	const warmW = useDerivedValue(() => S.w + (S.warmW - S.w) * warm.get());
	return (
		<>
			<Circle
				color={ink3}
				cx={YOU.x}
				cy={YOU.y}
				opacity={coolA}
				r={S.r}
				strokeWidth={S.w}
				style="stroke"
			>
				<DashPathEffect intervals={[...S.dash]} />
			</Circle>
			<Circle
				color={warmColor}
				cx={YOU.x}
				cy={YOU.y}
				opacity={warmA}
				r={S.r}
				strokeWidth={warmW}
				style="stroke"
			>
				<DashPathEffect intervals={[...S.dash]} />
			</Circle>
		</>
	);
}
