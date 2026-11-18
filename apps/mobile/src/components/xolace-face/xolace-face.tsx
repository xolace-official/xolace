// The Xolace face: a body (the logo's flame by default) with the pose-driven face on it. The
// whole body turns, rolls, squashes and breathes; the features move inside it.
//
// Decorative to screen readers: the screen around it says what it means. A placement that
// makes it interactive wraps it in its own labelled Pressable.

import {
	Canvas,
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
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

const ORIGIN = `${HEAD_ORIGIN.x}% ${HEAD_ORIGIN.y}%`;

type Props = {
	body?: BodyName;
	eyes?: EyeStyle;
	face: FaceHandle;
	/** Defaults to the brand gradient; an orb defaults to the theme accent. */
	palette?: PaletteName;
	size: number;
};

export function XolaceFace({
	body = "flame",
	eyes = "round",
	face,
	palette,
	size,
}: Props) {
	const { gradient, solid, shine, highlightClear, colors } = useFaceColors(
		body,
		palette
	);

	const headStyle = useAnimatedStyle(() => {
		const m = headMotion(
			face.pose.get(),
			face.clock.get(),
			face.nodAmount.get(),
			face.hopAmount.get()
		);
		return {
			transform: [
				{ perspective: HEAD_PERSPECTIVE },
				{ translateY: m.drop * size },
				{ rotateY: `${m.lean}deg` },
				{ rotateZ: `${m.roll}deg` },
				{ scaleX: m.scaleX },
				{ scaleY: m.scaleY },
			],
			transformOrigin: ORIGIN,
		};
	});

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{ height: size, width: size }}
		>
			<Animated.View style={[{ flex: 1 }, headStyle]}>
				<Canvas style={{ flex: 1 }}>
					<Group transform={[{ scale: size / FACE_BOX }]}>
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
				</Canvas>
			</Animated.View>
		</View>
	);
}
