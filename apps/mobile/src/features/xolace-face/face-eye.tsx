// One eye: sclera, pupil, glints and lids, recomputed from the geometry on the UI thread.

import { Circle, Oval, Path, Skia } from "@shopify/react-native-skia";
import { type DerivedValue, useDerivedValue } from "react-native-reanimated";
import {
	clamp,
	type EyeStyle,
	type FeatureColors,
	type PartProps,
} from "./face-geo";

const EYE_RX = 8.5;
const EYE_RY = 9.5;
const PUPIL_R = 6;
const SPARKLE_PUPIL_R = 6.6;
const GLINT_R = 1.7;
const SPARKLE_GLINT_R = 2.6;
const SECOND_GLINT_R = 1.1;
const SLEEPY_OPEN = 0.72;
const GAZE_X = 2.6;
const GAZE_Y = 2.8;
// Below this openness the glint would float outside a nearly shut eye.
const GLINT_MIN_OPEN = 0.45;

type Props = PartProps & { colors: FeatureColors; eyes: EyeStyle };

export function FaceEye({ colors, eyes, geo, side, spread }: Props) {
	// Sleepy: heavy upper lids, never fully open. Sparkle: bigger pupils, two glints.
	const openScale = eyes === "sleepy" ? SLEEPY_OPEN : 1;
	const pupilR = eyes === "sparkle" ? SPARKLE_PUPIL_R : PUPIL_R;
	const glintR = eyes === "sparkle" ? SPARKLE_GLINT_R : GLINT_R;

	const sclera = useDerivedValue(() => {
		const g = geo.get();
		const ry = Math.max(0.01, EYE_RY * g.open * openScale);
		return Skia.XYWHRect(
			g.cx + side * spread - EYE_RX,
			g.ey - ry,
			EYE_RX * 2,
			ry * 2
		);
	});
	const pupil = useDerivedValue(() => {
		const g = geo.get();
		const ry = Math.max(
			0.01,
			Math.min(pupilR, EYE_RY * g.open * openScale - 1.5)
		);
		const x = g.cx + side * spread + g.gx * GAZE_X;
		const y = g.ey + g.gy * GAZE_Y * g.open * openScale;
		return Skia.XYWHRect(x - pupilR, y - ry, pupilR * 2, ry * 2);
	});
	const glintX = useDerivedValue(() => {
		const g = geo.get();
		return g.cx + side * spread + g.gx * GAZE_X - 2;
	});
	const glintY = useDerivedValue(() => {
		const g = geo.get();
		return g.ey + g.gy * GAZE_Y - 2.3;
	});
	const glintOpacity = useDerivedValue<number>(() =>
		geo.get().open > GLINT_MIN_OPEN ? 1 : 0
	);
	// The closed-eye line fades in as the eye shuts, so a blink reads as a lid, not a vanish.
	const lid = useDerivedValue(() => {
		const g = geo.get();
		const x = g.cx + side * spread;
		const path = Skia.PathBuilder.Make();
		path.moveTo(x - EYE_RX, g.ey);
		path.quadTo(x, g.ey + 4, x + EYE_RX, g.ey);
		return path.detach();
	});
	const lidOpacity = useDerivedValue(() =>
		clamp((0.35 - geo.get().open) / 0.2, 0, 1)
	);

	return (
		<>
			<Oval color={colors.sclera} rect={sclera} />
			<Oval color={colors.pupil} rect={pupil} />
			<Circle
				color={colors.highlight}
				cx={glintX}
				cy={glintY}
				opacity={glintOpacity}
				r={glintR}
			/>
			{eyes === "sparkle" && (
				<SecondGlint
					color={colors.highlight}
					glintX={glintX}
					glintY={glintY}
					opacity={glintOpacity}
				/>
			)}
			{eyes === "sleepy" && (
				<HeavyLid color={colors.brow} geo={geo} side={side} spread={spread} />
			)}
			<Path
				color={colors.pupil}
				opacity={lidOpacity}
				path={lid}
				strokeCap="round"
				strokeWidth={2}
				style="stroke"
			/>
		</>
	);
}

// Their own components, so a face without the style doesn't recompute them every frame.

type SecondGlintProps = {
	color: string;
	glintX: DerivedValue<number>;
	glintY: DerivedValue<number>;
	opacity: DerivedValue<number>;
};

function SecondGlint({ color, glintX, glintY, opacity }: SecondGlintProps) {
	const cx = useDerivedValue(() => glintX.get() + 4.2);
	const cy = useDerivedValue(() => glintY.get() + 4);
	return (
		<Circle
			color={color}
			cx={cx}
			cy={cy}
			opacity={opacity}
			r={SECOND_GLINT_R}
		/>
	);
}

// A rounded lid that hugs the eye reads calm; a flat dark bar read as side-eye.
function HeavyLid({ color, geo, side, spread }: PartProps & { color: string }) {
	const path = useDerivedValue(() => {
		const g = geo.get();
		const x = g.cx + side * spread;
		const ry = EYE_RY * g.open * SLEEPY_OPEN;
		const top = g.ey - ry;
		const p = Skia.PathBuilder.Make();
		p.moveTo(x - EYE_RX, top + ry * 0.75);
		p.quadTo(x, top - ry * 0.55, x + EYE_RX, top + ry * 0.75);
		return p.detach();
	});
	return (
		<Path
			color={color}
			path={path}
			strokeCap="round"
			strokeWidth={1.6}
			style="stroke"
		/>
	);
}
