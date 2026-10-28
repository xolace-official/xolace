// The Xolacers beat: figure centred on the axis (Mirror/Vent flip sides, this one
// must not), another person's ember at eye height arriving first, and warmth on
// the face ~420ms later. The mask stays in the hand; nothing animates off the figure.

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
import { CompanionEmber } from "./companion-ember";
import { useDeckColor } from "./deck-color";
import { EmberGlow } from "./ember-glow";
import { deckFigureHeight, XOLACERS_SCALE } from "./figure-metrics";

const FIGURE = require("@/assets/images/flux/flux-sad.png");

const SRC_W = 635;
const SRC_H = 1054;
const ASPECT = SRC_W / SRC_H;

/** The face as a fraction of the source frame, measured off the asset. */
const FACE_X = 0.44;
const FACE_Y = 0.35;
/** Wide enough to spill past the head, so it reads as light falling on the figure. */
const FACE_GLOW = 0.95;
/** Warmth pushed toward the companion: centred, the figure reads as lit from within. */
const LIGHT_BIAS = 0.13;

/** Ember wash on the grey figure. Above ~0.4 it flattens; below ~0.25 it reads as stone. */
const WASH_ALPHA = 0.32;

/** Clearance kept under the figure so it never touches the pagination row. */
const FIGURE_FLOOR = 12;
/** Nudged off dead centre to open the right quadrant for the companion. */
const FIGURE_NUDGE = 40;

const COMPANION = 78;
/** Held off the right edge; an ember flush to the frame reads as a crop. */
const COMPANION_RIGHT = 6;

/** Matches the cover, the Mirror and Vent so all four share a cadence. */
const STEP = 95;
const DUR = 520;
/** Companion ember arrives after the figure settles. */
const ARRIVE = 560;
/** Their light reaches the face only after that. */
const WARMTH = 420;

export const XolacersBeat = ({ beat }: { beat: StoryBeat }) => {
	const ember = useDeckColor("ember");
	const reduced = useReducedMotion();
	const { height } = useWindowDimensions();

	const figH = deckFigureHeight(height) * XOLACERS_SCALE;
	const figW = figH * ASPECT;

	const faceGlow = figW * FACE_GLOW;
	// Eye height measured from the figure's floor, so the two stay level at every size.
	const companionBottom = FIGURE_FLOOR + figH * (1 - FACE_Y) - COMPANION / 2;

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
				className="items-center"
				entering={enter(4)}
				pointerEvents="none"
				style={{ paddingBottom: FIGURE_FLOOR, paddingRight: FIGURE_NUDGE }}
			>
				<View style={{ height: figH, width: figW }}>
					<Image
						contentFit="contain"
						source={FIGURE}
						style={{ height: figH, width: figW }}
					/>
					<Animated.View
						className="absolute"
						entering={
							reduced
								? undefined
								: FadeIn.delay(4 * STEP + ARRIVE + WARMTH).duration(1000)
						}
						pointerEvents="none"
					>
						<Image
							contentFit="contain"
							source={FIGURE}
							style={{ height: figH, opacity: WASH_ALPHA, width: figW }}
							tintColor={ember}
						/>
					</Animated.View>

					<Animated.View
						className="absolute"
						entering={
							reduced
								? undefined
								: FadeIn.delay(4 * STEP + ARRIVE + WARMTH).duration(900)
						}
						pointerEvents="none"
						style={{
							left: (FACE_X + LIGHT_BIAS) * figW - faceGlow / 2,
							top: FACE_Y * figH - faceGlow / 2,
						}}
					>
						<EmberGlow
							color={ember}
							id="xolacer-face"
							opacity={0.5}
							size={faceGlow}
						/>
					</Animated.View>
				</View>
			</Animated.View>

			<Animated.View
				className="absolute"
				entering={
					reduced ? undefined : FadeIn.delay(4 * STEP + ARRIVE).duration(1100)
				}
				pointerEvents="none"
				style={{ bottom: companionBottom, right: COMPANION_RIGHT }}
			>
				<CompanionEmber color={ember} reduced={reduced} size={COMPANION} />
			</Animated.View>
		</View>
	);
};
