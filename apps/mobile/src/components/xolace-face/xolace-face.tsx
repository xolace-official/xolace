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
import { useTokenColor } from "@/lib/use-token-color";
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
	const fg = useTokenColor("foreground");
	const bg = useTokenColor("background");
	const accent = useTokenColor("accent");
	const accentFg = useTokenColor("accent-foreground");
	const muted = useTokenColor("muted");
	const fixed: Omit<FeatureColors, "mouth"> = {
		blush: useTokenColor("face-blush"),
		brow: useTokenColor("face-brow"),
		highlight: useTokenColor("face-highlight"),
		pupil: useTokenColor("face-pupil"),
		sclera: useTokenColor("face-sclera"),
	};
	const highlightClear = useTokenColor("face-highlight-clear");

	const headStyle = useAnimatedStyle(() => {
		const p = face.pose.get();
		const c = face.clock.get();
		const breath = Math.sin(c * BREATH_HZ);
		const fidget = Math.sin(c * FIDGET_HZ) * p.restless * FIDGET_DEG;
		const hop = face.hopAmount.get();
		return {
			transform: [
				{ perspective: 400 },
				{
					translateY: (face.nodAmount.get() * NOD_DROP - hop * HOP_RISE) * size,
				},
				{ rotateY: `${p.lean * LEAN_DEG}deg` },
				{ rotateZ: `${p.tilt * TILT_DEG + fidget}deg` },
				{ scaleX: 1 + p.squash * SQUASH - breath * 0.006 },
				{ scaleY: 1 - p.squash * SQUASH + breath * 0.012 + hop * HOP_STRETCH },
			],
			// Turn and squash from the base, so it sits on its spot rather than spinning.
			transformOrigin: "50% 92%",
		};
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
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{ height: size, width: size }}
		>
			<Animated.View style={[{ flex: 1 }, headStyle]}>
				<Canvas style={{ flex: 1 }}>
					<Group transform={[{ scale: size / BOX }]}>
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
				</Canvas>
			</Animated.View>
		</View>
	);
}
