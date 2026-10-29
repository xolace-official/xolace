// One beat of the tale, laid out by the bespoke composition its `kind` owns.
// Cardless by #198. The slide's own translate is 0.8x the list's so copy trails the swipe.
import type { ReactElement } from "react";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useReducedMotion,
} from "react-native-reanimated";

import type { StoryBeat } from "@/features/onboarding/story-beats";
import { CoverBeat } from "./cover-beat";
import { MirrorBeat } from "./mirror-beat";
import { PlusBeat } from "./plus-beat";
import { ProofBeat } from "./proof-beat";
import { VentBeat } from "./vent-beat";
import { XolacersBeat } from "./xolacers-beat";

/** Every `kind` owns its own composition; no generic fallback. */
const BESPOKE: Record<
	StoryBeat["kind"],
	(p: { beat: StoryBeat }) => ReactElement
> = {
	cover: CoverBeat,
	mirror: MirrorBeat,
	plus: PlusBeat,
	proof: ProofBeat,
	vent: VentBeat,
	xolacers: XolacersBeat,
};

export const StoryBeatSlide = ({
	beat,
	index,
	width,
	scrollX,
}: {
	beat: StoryBeat;
	index: number;
	width: number;
	scrollX: SharedValue<number>;
}) => {
	// Reduced motion keeps the crossfade and drops the parallax.
	const reduced = useReducedMotion();

	const rStyle = useAnimatedStyle(() => {
		const range = [width * (index - 1), width * index, width * (index + 1)];
		const opacity = interpolate(
			scrollX.get(),
			range,
			[0, 1, 0],
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
						range,
						[22, 0, 22],
						Extrapolation.CLAMP
					),
				},
				{
					translateX: interpolate(
						scrollX.get(),
						range,
						[-width * 0.8, 0, width * 0.8],
						Extrapolation.CLAMP
					),
				},
			],
		};
	});

	// Known: every beat's `entering` fires at deck mount because the FlatList mounts all
	// slides at once. Gating the mount on scroll position blanks the deck whenever
	// `scrollX` and the real offset disagree; fix by driving reveals off `scrollX` instead.
	const Bespoke = BESPOKE[beat.kind];
	return (
		<Animated.View className="flex-1" style={[{ width }, rStyle]}>
			<Bespoke beat={beat} />
		</Animated.View>
	);
};
