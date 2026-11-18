// The Xolace face as a Skia group, for drawing inside another canvas (Reflect's ensō draws it
// inside the circle). `XolaceFace` turns its head with a view transform around its own canvas;
// here the same transform (perspective, nod/hop, lean, tilt + fidget, squash + breath, from
// 50% 92%) is a Skia matrix on the group. Colours as `XolaceFace` picks them.

import {
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { useTokenColors } from "@/lib/use-token-color";
import { BODY_PATHS, type BodyName, FACE_ANCHOR } from "./bodies";
import { FaceFeatures } from "./face-features";
import type { EyeStyle, FeatureColors } from "./face-geo";
import { PALETTES, type PaletteName } from "./face-palette";
import type { FaceHandle } from "./use-face";

const BOX = 100;
const BREATH_HZ = 1.7;
const FIDGET_HZ = 4.7;
const FIDGET_DEG = 2.5;
const NOD_DROP = 0.03;
const HOP_RISE = 0.08;
const HOP_STRETCH = 0.05;
const LEAN_DEG = 24;
const TILT_DEG = 12;
const SQUASH = 0.08;
const BREATH_X = 0.006;
const BREATH_Y = 0.012;
/** `XolaceFace`'s view perspective, in points. */
const PERSPECTIVE = 400;
const DEG = Math.PI / 180;
/** Turn and squash from the base, so it sits on its spot rather than spinning. */
const ORIGIN = vec(50, 92);

const TOKENS = [
	"foreground",
	"background",
	"accent",
	"accent-foreground",
	"muted",
	"face-blush",
	"face-brow",
	"face-highlight",
	"face-pupil",
	"face-sclera",
	"face-highlight-clear",
] as const;

type Props = {
	body?: BodyName;
	eyes?: EyeStyle;
	face: FaceHandle;
	/** Defaults to the brand gradient; an orb defaults to the theme accent. */
	palette?: PaletteName;
	size: number;
	/** Top-left of the face inside its canvas. */
	x?: number;
	y?: number;
};

/** The face as a Skia group, `size` square at (`x`, `y`) in the canvas it is drawn in. */
export function FaceDrawing({
	body = "flame",
	eyes = "round",
	face,
	palette,
	size,
	x = 0,
	y = 0,
}: Props) {
	const [
		fg,
		bg,
		accent,
		accentFg,
		muted,
		blush,
		brow,
		highlight,
		pupil,
		sclera,
		highlightClear,
	] = useTokenColors(TOKENS);
	const fixed: Omit<FeatureColors, "mouth"> = {
		blush,
		brow,
		highlight,
		pupil,
		sclera,
	};

	const head = useDerivedValue(() => {
		const p = face.pose.get();
		const c = face.clock.get();
		const breath = Math.sin(c * BREATH_HZ);
		const fidget = Math.sin(c * FIDGET_HZ) * p.restless * FIDGET_DEG;
		const hop = face.hopAmount.get();
		return [
			{ perspective: (PERSPECTIVE * BOX) / size },
			{ translateY: (face.nodAmount.get() * NOD_DROP - hop * HOP_RISE) * BOX },
			{ rotateY: p.lean * LEAN_DEG * DEG },
			{ rotateZ: (p.tilt * TILT_DEG + fidget) * DEG },
			{ scaleX: 1 + p.squash * SQUASH - breath * BREATH_X },
			{
				scaleY: 1 - p.squash * SQUASH + breath * BREATH_Y + hop * HOP_STRETCH,
			},
		];
	});

	// Chalk (the square) is flat, in the theme's text colour, and ignores the palette.
	const flat = body === "square";
	const set = palette ?? (body === "orb" ? "theme" : "brand");
	const gradient =
		flat || set === "theme" || set === "muted" ? null : PALETTES[set];
	const solid = set === "muted" ? muted : accent;
	let colors: FeatureColors;
	if (flat) {
		colors = { ...fixed, brow: bg, mouth: bg, pupil: fg, sclera: bg };
	} else if (gradient) {
		colors = { ...fixed, mouth: gradient.mouth };
	} else if (set === "muted") {
		colors = { ...fixed, brow: bg, mouth: bg };
	} else {
		colors = { ...fixed, brow: accentFg, mouth: accentFg };
	}

	return (
		<Group
			transform={[{ translateX: x }, { translateY: y }, { scale: size / BOX }]}
		>
			<Group origin={ORIGIN} transform={head}>
				{gradient ? (
					<Path path={BODY_PATHS[body]}>
						<LinearGradient
							colors={gradient.stops}
							end={vec(82, 4)}
							positions={gradient.positions}
							start={vec(18, 96)}
						/>
					</Path>
				) : (
					<Path color={flat ? fg : solid} path={BODY_PATHS[body]} />
				)}
				{!flat && (
					<Path path={BODY_PATHS[body]}>
						<RadialGradient
							c={vec(34, 40)}
							colors={[colors.highlight, highlightClear]}
							r={46}
						/>
					</Path>
				)}
				<FaceFeatures
					anchor={FACE_ANCHOR[body]}
					clock={face.clock}
					colors={colors}
					eyes={eyes}
					nod={face.nodAmount}
					pose={face.pose}
				/>
			</Group>
		</Group>
	);
}
