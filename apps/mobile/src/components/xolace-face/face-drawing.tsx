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
	palette?: PaletteName;
	size: number;
	x?: number;
	y?: number;
};

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
