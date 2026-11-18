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
/** Room around the circle for the bleed. */
const PAD = 16;
/** Board `.dry`: the dotted dry-brush guide, 3.5 pt outside the ink's centreline. */
const DRY = { dash: [5, 10.8], out: 3.5, width: 2.2 };
/** Board `.blot`: where the brush lands, r 8.5, at .95. */
const BLOT = { opacity: 0.95, r: 8.5 };

type Props = {
	size: number;
	mode: EnsoMode;
	/** The answer arrived: the circle closes in .42 s and bleeds. */
	landed: boolean;
	running: boolean;
	reduced: boolean;
	low: boolean;
	late: boolean;
	face?: FaceHandle | null;
	faceSize: number;
	/** The face's eyes follow the brush (the wait, not slow or offline). */
	follow: boolean;
	/** Heard: bleed once, starting this many ms in, over this long. */
	bleedOnce?: { delayMs: number; ms: number };
};

/** A colour string as the shader's `inkColor`: 0–1 RGB. */
function rgbOf(color: string): number[] {
	const c = Skia.Color(color);
	return [c[0], c[1], c[2]];
}

/**
 * The ensō (S5, native-cook brush-ink-splash): one Vertices mesh through the ink shader, on
 * paper baked once. Only `head` changes per frame while it paints (`useEnsoInk`). The face sits
 * inside, in this same canvas, its eyes on the brush. Decorative: the stage line says what it
 * means.
 */
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
				{/* Under the stroke, so the ink's own texture lies over the landing blot. */}
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
