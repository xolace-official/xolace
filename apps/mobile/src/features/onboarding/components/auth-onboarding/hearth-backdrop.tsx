// One fire mounted once behind every beat, with the carousel as the camera: it drops
// and dims where the words need the screen and flares on the last beat. Keyframes
// are keyed to `STORY_BEATS` order and composite onto the dawn arc (`SkyArc`).

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useReducedMotion,
} from "react-native-reanimated";

import { STORY_BEATS } from "@/features/onboarding/story-beats";
import { HearthVideo } from "./hearth-video";
import { SkyArc } from "./sky-arc";

/** One keyframe per beat. Values are interpolated continuously between them. */
const SCALE = [1.16, 1.0, 1.08, 1.06, 1.06, 1.22];
const RISE = [0, 74, 26, 34, 30, -18];
const BRIGHT = [1, 0.6, 0.86, 0.82, 0.84, 1];

const BLEND_SCREEN = { mixBlendMode: "screen" } as const;

/** Top scrim strength per beat. Relaxes as the sky lifts, or a black bar sits on the dawn. */
const TOP_SCRIM_AT = [1, 1, 0.9, 0.7, 0.5, 0.28];

export const HearthBackdrop = ({
	scrollX,
	width,
	dawnCeiling = 1,
}: {
	scrollX: SharedValue<number>;
	width: number;
	/** 1 = full sunrise. Lower holds a dark-theme user at a pre-dawn glow. */
	dawnCeiling?: number;
}) => {
	const { height: screenHeight, width: screenWidth } = useWindowDimensions();
	// The looped list ends on a duplicate of beat 0, so the ramps return to the opening
	// framing. Built on the JS thread: a worklet may not call a plain closure.
	const stops = [...SCALE.map((_, i) => width * i), width * STORY_BEATS.length];
	const scale = [...SCALE, SCALE[0]];
	const rise = [...RISE, RISE[0]];
	const bright = [...BRIGHT, BRIGHT[0]];
	const topScrim = [...TOP_SCRIM_AT, TOP_SCRIM_AT[0]];

	// Reduced motion keeps the brightness arc and parks the camera.
	const reduced = useReducedMotion();

	const rFire = useAnimatedStyle(() => {
		const opacity = interpolate(
			scrollX.get(),
			stops,
			bright,
			Extrapolation.CLAMP
		);
		if (reduced) {
			return { opacity, transform: [] };
		}
		return {
			opacity,
			transform: [
				{
					translateY: interpolate(
						scrollX.get(),
						stops,
						rise,
						Extrapolation.CLAMP
					),
				},
				{
					scale: interpolate(scrollX.get(), stops, scale, Extrapolation.CLAMP),
				},
			],
		};
	});

	const rTopScrim = useAnimatedStyle(() => ({
		opacity: interpolate(scrollX.get(), stops, topScrim, Extrapolation.CLAMP),
	}));

	return (
		<View className="absolute inset-0" pointerEvents="none">
			<SkyArc dawnCeiling={dawnCeiling} scrollX={scrollX} width={width} />

			<View style={[styles.flexFull, BLEND_SCREEN]}>
				<Animated.View style={[styles.flexFull, rFire]}>
					<HearthVideo height={screenHeight} width={screenWidth} />
				</Animated.View>
			</View>

			{/* Pulls the top third back to black so type never sits on the fire's haze. */}
			<Animated.View style={[styles.topScrim, rTopScrim]}>
				<LinearGradient
					colors={["rgba(0,0,0,0.88)", "rgba(0,0,0,0.30)", "transparent"]}
					locations={[0, 0.42, 1]}
					style={StyleSheet.absoluteFill}
				/>
			</Animated.View>

			{/* Legibility floor under the words: holds 4.5:1 without reading as a black box. */}
			<LinearGradient
				colors={["transparent", "rgba(0,0,0,0.62)", "rgba(0,0,0,0.88)"]}
				locations={[0, 0.46, 1]}
				style={styles.bottomScrim}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	bottomScrim: {
		bottom: 0,
		height: "52%",
		left: 0,
		position: "absolute",
		right: 0,
	},
	flexFull: { flex: 1 },
	topScrim: { height: "55%", left: 0, position: "absolute", right: 0, top: 0 },
});
