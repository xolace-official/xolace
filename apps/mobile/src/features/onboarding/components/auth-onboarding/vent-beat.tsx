import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import type { StoryBeat } from "@/features/onboarding/story-beats";
import { useDeckColor } from "./deck-color";
import { deckFigureHeight, VENT_SCALE_MATCH } from "./figure-metrics";
import { VentSparks } from "./vent-sparks";

const FIGURE = require("@/assets/images/flux/vent-bg.png");

const SRC_W = 562;
const SRC_H = 883;
const ASPECT = SRC_W / SRC_H;

/**
 * Where the plume starts, as a fraction of the source frame.
 *
 * X is the open mouth. Y is NOT — it sits just above the head's silhouette at
 * that x, and this is a device finding rather than a preference: an ember-
 * coloured spark drawn over the character's own peach-lit face is invisible.
 * Started at the mouth, the first ~100pt of every spark's climb was spent
 * crossing the head, so the only ones that ever showed against the dark were
 * the ones that had already faded out. Starting clear of the silhouette puts
 * the whole plume on the background it was drawn to be seen against, and it
 * still reads as breath — it leaves from directly above the mouth.
 *
 * Both move with the asset if the pose is ever re-rendered.
 */
const PLUME_X = 0.632;
const PLUME_Y = 0.09;

/** Left inset of the figure inside the slide's own padding, and the clearance
 *  kept under it so the character never touches the pagination row. */
const FIGURE_INSET = 4;
const FIGURE_FLOOR = 12;

/** Matches the cover and the Mirror so all three bespoke slides share a cadence. */
const STEP = 95;
const DUR = 520;
/** The breath starts after the character has settled, never with it. */
const BREATH_IN = 520;

export const VentBeat = ({ beat }: { beat: StoryBeat }) => {
	const ember = useDeckColor("ember");
	const reduced = useReducedMotion();
	const { height } = useWindowDimensions();

	const figH = deckFigureHeight(height) * VENT_SCALE_MATCH;
	const figW = figH * ASPECT;

	// Both measured from the slide's content box, matching the bottom-anchored
	// figure, so the plume stays with the character at every screen size.
	const plumeX = FIGURE_INSET + PLUME_X * figW;
	const plumeBottom = FIGURE_FLOOR + (1 - PLUME_Y) * figH;

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

			{beat.tag ? (
				<Animated.View entering={enter(3)}>
					<AppText className="mt-4 text-[10.5px] text-ember/75 uppercase tracking-[2px]">
						{beat.tag}
					</AppText>
				</Animated.View>
			) : null}

			<View className="min-h-3 flex-1" />

			<Animated.View
				className="items-start"
				entering={enter(4)}
				pointerEvents="none"
				style={{ paddingBottom: FIGURE_FLOOR, paddingLeft: FIGURE_INSET }}
			>
				<Image
					contentFit="contain"
					source={FIGURE}
					style={{ height: figH, width: figW }}
				/>
			</Animated.View>

			<Animated.View
				className="absolute inset-0"
				entering={
					reduced ? undefined : FadeIn.delay(4 * STEP + BREATH_IN).duration(900)
				}
				pointerEvents="none"
			>
				<VentSparks
					color={ember}
					originBottom={plumeBottom}
					originX={plumeX}
					reduced={reduced}
				/>
			</Animated.View>
		</View>
	);
};
