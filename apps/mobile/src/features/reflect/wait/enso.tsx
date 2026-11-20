import {
	Canvas,
	Circle,
	DashPathEffect,
	Group,
	Path,
	Shader,
	Skia,
	Vertices,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { FaceDrawing } from "@/components/xolace-face/face-drawing";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { useTokenColor } from "@/lib/use-token-color";
import { buildEnso, ensoGuide } from "./enso-art";
import { EnsoPaper } from "./enso-paper";
import { INK_SKSL } from "./enso-shader";
import { type EnsoMode, useEnsoInk } from "./use-enso-ink";

const inkEffect = Skia.RuntimeEffect.Make(INK_SKSL);
const PAD = 16;
const DRY = { dash: [5, 10.8], out: 3.5, width: 2.2 };
const BLOT = { opacity: 0.95, r: 8.5 };

type Props = {
	size: number;
	mode: EnsoMode;
	landed: boolean;
	running: boolean;
	reduced: boolean;
	low: boolean;
	late: boolean;
	face?: FaceHandle | null;
	faceSize: number;
	follow: boolean;
	bleedOnce?: { delayMs: number; ms: number };
};

function rgbOf(color: string): number[] {
	const c = Skia.Color(color);
	return [c[0], c[1], c[2]];
}

export function Enso({
	size,
	mode,
	landed,
	running,
	reduced,
	low,
	late,
	face = null,
	faceSize,
	follow,
	bleedOnce,
}: Props) {
	const ink = useTokenColor(late ? "reflect-ink-late" : "reflect-ink");
	const { plan, mesh, start } = buildEnso(size);
	const length = plan.length;
	const full = length + plan.ends[0];
	const box = size + PAD * 2;
	const { blot, bleed, dry, head } = useEnsoInk({
		bleedOnce,
		face,
		follow,
		full,
		landed,
		length,
		low,
		mode,
		reduced,
		running,
	});

	const inkColor = rgbOf(ink);
	const uniforms = useDerivedValue(() => ({
		alpha: 1,
		bleed: bleed.get(),
		caps: plan.caps,
		dry: plan.dry,
		ends: plan.ends,
		head: head.get(),
		inkColor,
		lengths: plan.lengths,
		starts: plan.starts,
	}));
	const blotR = useDerivedValue(() => BLOT.r * blot.get());
	const centre = size / 2;
	const dryPath = ensoGuide(size, DRY.out);
	const closed = mode === "closed";

	return (
		<Canvas
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ height: box, margin: -PAD, width: box }}
		>
			{low ? null : <EnsoPaper box={box} late={late} />}
			<Group transform={[{ translateX: PAD }, { translateY: PAD }]}>
				{closed ? null : (
					<Path
						color={ink}
						opacity={dry}
						path={dryPath}
						strokeCap="round"
						strokeWidth={DRY.width}
						style="stroke"
					>
						<DashPathEffect intervals={DRY.dash} />
					</Path>
				)}
				{closed ? null : (
					<Circle
						color={ink}
						cx={start.x}
						cy={start.y}
						opacity={BLOT.opacity}
						r={blotR}
					/>
				)}
				{inkEffect ? (
					<Vertices
						indices={mesh.indices}
						mode="triangles"
						textures={mesh.textures}
						vertices={mesh.vertices}
					>
						<Shader source={inkEffect} uniforms={uniforms} />
					</Vertices>
				) : null}
				{face ? (
					<FaceDrawing
						face={face}
						palette={late ? "ember" : undefined}
						size={faceSize}
						x={centre - faceSize / 2}
						y={centre - faceSize / 2}
					/>
				) : null}
			</Group>
		</Canvas>
	);
}
