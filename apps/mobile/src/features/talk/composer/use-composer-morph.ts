import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
	interpolateColor,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { TalkGeometry } from "../motion/talk-geometry";
import {
	ENTER_EASE,
	GO,
	INTRO,
	LAYOUT,
	OUT_EASE,
	seg,
} from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";

/** Liquid Glass on iOS 26; elsewhere the composer keeps its translucent fill. */
export const HAS_GLASS = isLiquidGlassAvailable();
/** Once the box has landed, the glass fades in under the field over this. */
const GLASS_MS = 220;
export const ROUND = { borderRadius: LAYOUT.composerH / 2 } as const;
const HAIRLINE = 0.5;

/** How far the glass has taken over from the fill: after the morph, or at once reduced. */
function glassIn(g: number, reduced: boolean) {
	"worklet";
	if (!HAS_GLASS) {
		return 0;
	}
	return reduced
		? seg(g, GO.reduced / 2, GO.reduced / 2)
		: seg(g, GO.morph, GLASS_MS);
}

/**
 * The Start button's morph into the composer (§6), on the start → talk timeline: the box
 * (place, size, corners, hairline, the entrance's last step and the press), its fill turning
 * to glass, the label going and the field arriving. All on the UI thread.
 */
export function useComposerMorph({
	geo,
	motion,
	startTop,
	lift,
	pressed,
	fill,
	glass,
}: {
	geo: TalkGeometry;
	motion: TalkMotion;
	startTop: SharedValue<number>;
	lift: SharedValue<number>;
	pressed: SharedValue<number>;
	/** The button's fill (ink, or the well when time is low) and the composer's glass colour. */
	fill: string;
	glass: string;
}) {
	const box = useAnimatedStyle(() => {
		const g = motion.go.get();
		const reduced = motion.reduced.get();
		const half = GO.reduced / 2;
		const m = reduced ? Number(g > half) : seg(g, 0, GO.morph, OUT_EASE);
		const to = geo.composerTop - lift.get();
		const from = startTop.get();
		// The entrance cascade's last step (§2.8).
		const i = motion.intro.get();
		const inP = reduced
			? seg(i, 0, GO.reduced)
			: seg(i, INTRO.gap * (INTRO.groups - 1), INTRO.length, ENTER_EASE);
		let opacity = inP;
		if (reduced) {
			opacity *= g > half ? (g - half) / half : 1 - g / half;
		}
		return {
			borderRadius:
				LAYOUT.startH / 2 + (LAYOUT.composerH / 2 - LAYOUT.startH / 2) * m,
			borderWidth:
				(reduced ? m : seg(g, GO.fillAt, GO.fillMs)) *
				HAIRLINE *
				(1 - glassIn(g, reduced)),
			height: LAYOUT.startH + (LAYOUT.composerH - LAYOUT.startH) * m,
			left: LAYOUT.gutter + (LAYOUT.fieldLeft - LAYOUT.gutter) * m,
			opacity,
			top: from + (to - from) * m,
			transform: [
				{ translateY: INTRO.rise * (1 - inP) },
				{ scale: pressed.get() },
			],
		};
	});
	// The ink fill turns to the translucent glass colour as the box moves. On iOS 26 real
	// glass takes over once the box has landed: a crossfade by opacity, never a colour into it.
	const fillStyle = useAnimatedStyle(() => {
		const g = motion.go.get();
		const reduced = motion.reduced.get();
		const p = reduced
			? Number(g > GO.reduced / 2)
			: seg(g, GO.fillAt, GO.fillMs);
		return {
			backgroundColor: interpolateColor(p, [0, 1], [fill, glass]),
			opacity: 1 - glassIn(g, reduced),
		};
	});
	const glassStyle = useAnimatedStyle(() => ({
		opacity: glassIn(motion.go.get(), motion.reduced.get()),
	}));
	const label = useAnimatedStyle(() => {
		const g = motion.go.get();
		return {
			opacity: motion.reduced.get()
				? Number(g === 0)
				: 1 - seg(g, 0, GO.labelOut),
		};
	});
	const field = useAnimatedStyle(() => {
		const g = motion.go.get();
		return {
			opacity: motion.reduced.get()
				? seg(g, GO.reduced / 2, GO.reduced / 2)
				: seg(g, GO.fieldIn, GO.fieldInMs),
		};
	});

	return { box, field, fill: fillStyle, glass: glassStyle, label };
}
