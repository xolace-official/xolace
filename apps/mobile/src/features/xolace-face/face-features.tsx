// Eyes, brows, mouth and cheeks, drawn in the body's 100×100 box and recomputed from the
// pose on the UI thread every frame.

import { Oval, Path, Skia } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { FaceEye } from "./face-eye";
import {
	clamp,
	type EyeStyle,
	type FeatureColors,
	type Geo,
	type PartProps,
} from "./face-geo";
import type { Pose } from "./pose";

const SIDES = [-1, 1] as const;
const MOUTH_DROP = 15;
const MOUTH_HALF_WIDTH = 6.5;
const MOUTH_CURVE = 4.5;

type Props = {
	anchor: { y: number; spread: number };
	clock: SharedValue<number>;
	colors: FeatureColors;
	eyes: EyeStyle;
	nod: SharedValue<number>;
	pose: SharedValue<Pose>;
};

export function FaceFeatures({
	anchor,
	clock,
	colors,
	eyes,
	nod,
	pose,
}: Props) {
	const geo = useDerivedValue<Geo>(() => {
		const p = pose.get();
		const c = clock.get();
		const r = p.restless;
		// Layered sines, so the fidget never visibly loops.
		const jx = (Math.sin(c * 6.1) + 0.5 * Math.sin(c * 13.7)) * r * 0.8;
		const jy = (Math.cos(c * 5.3) + 0.5 * Math.sin(c * 11.9)) * r * 0.6;
		// Restless eyes dart a little; still ones don't.
		const dart = Math.sin(c * 2.3) * Math.sin(c * 0.7) * r * 0.7;
		return {
			asym: p.browAsym,
			brow: p.brow,
			cheeks: clamp(p.cheeks, 0, 1),
			cx: 50 + p.lean * 6 + jx,
			ey: anchor.y + jy + nod.get() * 2,
			gx: clamp(p.gazeX + dart, -1, 1),
			gy: clamp(p.gazeY, -1, 1),
			lift: p.browLift,
			mouth: p.mouth,
			mouthOpen: clamp(p.mouthOpen, 0, 1),
			open: clamp(p.eyeOpen, 0, 1.1),
		};
	});

	const mouthPath = useDerivedValue(() => {
		const g = geo.get();
		const cy = g.ey + MOUTH_DROP;
		const d = g.mouth * MOUTH_CURVE;
		const path = Skia.PathBuilder.Make();
		path.moveTo(g.cx - MOUTH_HALF_WIDTH, cy - d * 0.3);
		path.quadTo(g.cx, cy + d * 1.7, g.cx + MOUTH_HALF_WIDTH, cy - d * 0.3);
		return path.detach();
	});
	const mouthHole = useDerivedValue(() => {
		const g = geo.get();
		const w = g.mouthOpen * 8;
		const h = g.mouthOpen * 9;
		return Skia.XYWHRect(g.cx - w / 2, g.ey + MOUTH_DROP + g.mouth * 2, w, h);
	});

	return (
		<>
			{SIDES.map((side) => (
				<Cheek
					color={colors.blush}
					geo={geo}
					key={`cheek${side}`}
					side={side}
					spread={anchor.spread}
				/>
			))}
			{SIDES.map((side) => (
				<FaceEye
					colors={colors}
					eyes={eyes}
					geo={geo}
					key={`eye${side}`}
					side={side}
					spread={anchor.spread}
				/>
			))}
			{SIDES.map((side) => (
				<Brow
					color={colors.brow}
					geo={geo}
					key={`brow${side}`}
					side={side}
					spread={anchor.spread}
				/>
			))}
			<Oval color={colors.mouth} rect={mouthHole} />
			<Path
				color={colors.mouth}
				path={mouthPath}
				strokeCap="round"
				strokeWidth={2.4}
				style="stroke"
			/>
		</>
	);
}

function Brow({ color, geo, side, spread }: PartProps & { color: string }) {
	const path = useDerivedValue(() => {
		const g = geo.get();
		const x = g.cx + side * spread;
		const y = g.ey - 14 - g.lift * 3.5 - side * g.asym * 2.5;
		const inner = x - side * 5;
		const outer = x + side * 5;
		const p = Skia.PathBuilder.Make();
		p.moveTo(outer, y + g.brow * 1.2);
		p.quadTo(x, y - 1.6, inner, y - g.brow * 2.8);
		return p.detach();
	});
	return (
		<Path
			color={color}
			path={path}
			strokeCap="round"
			strokeWidth={2}
			style="stroke"
		/>
	);
}

function Cheek({ color, geo, side, spread }: PartProps & { color: string }) {
	const rect = useDerivedValue(() => {
		const g = geo.get();
		return Skia.XYWHRect(g.cx + side * (spread + 5) - 4.5, g.ey + 8, 9, 5);
	});
	const opacity = useDerivedValue(() => geo.get().cheeks);
	return <Oval color={color} opacity={opacity} rect={rect} />;
}
