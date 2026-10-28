/**
 * The Mirror beat. Like the cover, this one owns its own composition rather
 * than using the deck's centred illustration-over-copy stack.
 *
 *     ✦ THE MIRROR      ← chapter mark, left axis
 *     the line          ← left axis
 *     the aside         ← left axis
 *     (space)
 *              figure   ← pushed RIGHT of the text axis
 *     ──────────────    ← the waterline, full-bleed
 *              reflect  ← the same figure, flipped and dissolving downward
 *
 * Three things are doing work here:
 *
 * 1. THE REFLECTION IS THE POINT. The beat says the Mirror reads your feeling
 *    back to you, so the slide shows exactly that and nothing else: one figure,
 *    and the same figure returned. It is one asset used twice — the reflection
 *    is `mirror-v2-bg.png` flipped, softened and masked to dissolve, never a
 *    second drawing.
 *
 * 2. IT ARRIVES LATE. The reflection fades in ~380ms AFTER the figure, so it
 *    reads as catching up rather than as a mirrored decal. That delay is the
 *    whole mechanic in motion — remove it and the slide is just symmetry.
 *
 * 3. THE FIGURE SITS RIGHT OF THE AXIS. `VentBeat` will place its figure LEFT,
 *    so swiping between the pair flips the character across the axis and
 *    reverses what it emits (down into water / up into air). Mirror and Vent
 *    are alternatives, not steps, and the motion between them has to say so —
 *    see the pair note in `story-beats.ts`.
 *
 * The ember hairline is the same motif the cover uses as its horizon, given a
 * new job here as the water's surface. Same rule, different work — which is
 * what keeps the deck reading as one deck.
 *
 * The fire, sky and scrims belong to `HearthBackdrop` and are untouched here.
 */

import MaskedView from "@react-native-masked-view/masked-view";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import type { StoryBeat } from "@/features/onboarding/story-beats";
import { useDeckColor } from "./deck-color";
import { deckFigureHeight, REFLECT_RATIO } from "./figure-metrics";

const FIGURE = require("@/assets/images/flux/mirror-v2-bg.png");

/** Intrinsic source geometry. The empty alpha under the character's feet is
 *  what the seam correction below cancels out — measured, not guessed. */
const SRC_W = 434;
const SRC_H = 675;
const SRC_FOOT_PAD = 16;
const ASPECT = SRC_W / SRC_H;

/** Matches the cover's staging so the two bespoke slides share a cadence. */
const STEP = 95;
const DUR = 520;
/** The Mirror's own beat: how far behind the figure its reflection lands. */
const CATCH_UP = 380;

const styles = StyleSheet.create({
	flexFull: { flex: 1 },
});

/** Fully static — hoisted so it isn't rebuilt as a fresh element every render. */
const REFLECT_MASK = (
	<LinearGradient
		colors={["rgba(0,0,0,1)", "rgba(0,0,0,0)"]}
		style={styles.flexFull}
	/>
);

export const MirrorBeat = ({ beat }: { beat: StoryBeat }) => {
	const ember = useDeckColor("ember");
	const reduced = useReducedMotion();
	const { height } = useWindowDimensions();

	// Shared with the Vent beat so the pair's character stays one size.
	const figH = deckFigureHeight(height);
	const figW = figH * ASPECT;
	const reflectH = figH * REFLECT_RATIO;
	// The source carries empty pixels below the feet. Mirrored, that gap appears
	// twice and the character floats off its own reflection. Pull both the line
	// and the reflection up by one pad each to close the seam.
	const seam = -(figH * SRC_FOOT_PAD) / SRC_H;

	const enter = (index: number) =>
		reduced ? undefined : FadeInDown.delay(index * STEP).duration(DUR);

	return (
		<View className="flex-1 px-9 pt-6">
			<Animated.View
				className="mb-6 flex-row items-center gap-2.5"
				entering={enter(0)}
			>
				<SymbolView
					name={beat.symbol}
					size={15}
					tintColor={ember}
					type="hierarchical"
				/>
				<AppText className="text-[10.5px] text-ember/75 uppercase tracking-[2.2px]">
					{beat.label}
				</AppText>
			</Animated.View>

			<Animated.View entering={enter(1)}>
				<AppText className="font-poppins-medium text-[32px] text-foreground/95 leading-11.25">
					{beat.beat}
				</AppText>
			</Animated.View>

			<Animated.View entering={enter(2)}>
				<AppText className="mt-5 pr-4 text-[14px] text-foreground/42 leading-6">
					{beat.aside}
				</AppText>
			</Animated.View>

			<View className="min-h-3 flex-1" />

			<Animated.View
				className="items-end pr-1"
				entering={enter(3)}
				pointerEvents="none"
			>
				<Image
					contentFit="contain"
					source={FIGURE}
					style={{ height: figH, width: figW }}
				/>
			</Animated.View>

			{/* The waterline. Full-bleed on purpose: it is a surface the scene sits
          on, not a rule belonging to the text column. */}
			<Animated.View
				className="-mx-9 h-px bg-ember/45"
				entering={reduced ? undefined : FadeIn.delay(3 * STEP).duration(DUR)}
				style={{ marginTop: seam }}
			/>

			<View
				className="items-end pr-1"
				pointerEvents="none"
				style={{ height: reflectH, marginTop: seam }}
			>
				<Animated.View
					entering={
						reduced
							? undefined
							: FadeIn.delay(3 * STEP + CATCH_UP).duration(760)
					}
				>
					<MaskedView
						maskElement={REFLECT_MASK}
						style={{ height: reflectH, width: figW }}
					>
						<Image
							blurRadius={2}
							contentFit="contain"
							source={FIGURE}
							style={{ height: figH, transform: [{ scaleY: -1 }], width: figW }}
						/>
					</MaskedView>
				</Animated.View>
			</View>
		</View>
	);
};
