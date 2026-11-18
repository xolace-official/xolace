// The Xolace face as a Skia group, for drawing inside another canvas (Reflect's ensō draws it
// inside the circle). `XolaceFace` turns its head with a view transform around its own canvas;
// here the same transform (perspective, nod/hop, lean, tilt + fidget, squash + breath, from
// its base) is a Skia matrix on the group. Both take the motion from `face-motion.ts` and the
// colours from `face-colors.ts`.

import {
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { BODY_PATHS, type BodyName, FACE_ANCHOR } from "./bodies";
import { FaceFeatures } from "./face-features";
import type { EyeStyle } from "./face-geo";
import {
	FACE_BOX,
	HEAD_ORIGIN,
	HEAD_PERSPECTIVE,
	headMotion,
} from "./face-motion";
import type { PaletteName } from "./face-palette";
import type { FaceHandle } from "./use-face";
import { useFaceColors } from "./use-face-colors";

const DEG = Math.PI / 180;
const ORIGIN = vec(HEAD_ORIGIN.x, HEAD_ORIGIN.y);

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
	const { gradient, solid, shine, highlightClear, colors } = useFaceColors(
		body,
		palette
	);

	const head = useDerivedValue(() => {
		const m = headMotion(
			face.pose.get(),
			face.clock.get(),
			face.nodAmount.get(),
			face.hopAmount.get()
		);
		return [
			// The perspective is in points; this group draws in the face's 100-unit box.
			{ perspective: (HEAD_PERSPECTIVE * FACE_BOX) / size },
			{ translateY: m.drop * FACE_BOX },
			{ rotateY: m.lean * DEG },
			{ rotateZ: m.roll * DEG },
			{ scaleX: m.scaleX },
			{ scaleY: m.scaleY },
		];
	});

	return (
		<Group
			transform={[
				{ translateX: x },
				{ translateY: y },
				{ scale: size / FACE_BOX },
			]}
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
					<Path color={solid} path={BODY_PATHS[body]} />
				)}
				{shine && (
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
