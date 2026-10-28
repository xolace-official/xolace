// The Mirror beat: figure right of the text axis over a full-bleed waterline, with
// the same asset flipped and masked as a reflection that lands ~380ms later. Vent
// places its figure left, so swiping the pair flips the character (see `story-beats.ts`).

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

/** Intrinsic source geometry, measured. The foot pad is the empty alpha under the feet. */
const SRC_W = 434;
const SRC_H = 675;
const SRC_FOOT_PAD = 16;
const ASPECT = SRC_W / SRC_H;

/** Matches the cover's staging so the two bespoke slides share a cadence. */
const STEP = 95;
const DUR = 520;
/** How far behind the figure its reflection lands. */
const CATCH_UP = 380;

const styles = StyleSheet.create({
	flexFull: { flex: 1 },
});

/** Static, hoisted so it is not rebuilt every render. */
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
	// Mirrored, the foot pad appears twice and the figure floats off its reflection;
	// the line and the reflection each move up by one pad to close the seam.
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

			{/* The waterline, full-bleed: a surface the scene sits on, not a text rule. */}
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
