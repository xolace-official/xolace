/** The opening title card. It deliberately breaks the deck's grid. */

import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import type { StoryBeat } from "@/features/onboarding/story-beats";
import { useDeckColor } from "./deck-color";

/** Staged so the card assembles rather than snapping in all at once. */
const STEP = 95;
const DUR = 520;

export const CoverBeat = ({ beat }: { beat: StoryBeat }) => {
	const ember = useDeckColor("ember");
	// Reduced motion drops the entrance entirely.
	const reduced = useReducedMotion();
	const enter = (index: number) =>
		reduced ? undefined : FadeInDown.delay(index * STEP).duration(DUR);

	return (
		<View className="flex-1 px-9 pt-6">
			{/* Wordmark. Only the cover carries it. */}
			<Animated.View
				className="mb-9 flex-row items-center gap-2"
				entering={enter(0)}
			>
				<SymbolView
					name={beat.symbol}
					size={16}
					tintColor={ember}
					type="hierarchical"
				/>
				<AppText className="font-poppins-medium text-[11px] text-ember uppercase tracking-[3.4px]">
					Xolace
				</AppText>
			</Animated.View>

			<Animated.View entering={enter(1)}>
				<AppText className="font-poppins-medium text-[34px] text-foreground leading-11.5">
					{beat.beat}
				</AppText>
			</Animated.View>

			{/* The horizon line, on the same left axis as everything else. */}
			<Animated.View
				className="mt-7 mb-6 h-px w-9 bg-ember/60"
				entering={enter(2)}
			/>

			<Animated.View entering={enter(3)}>
				<AppText className="pr-2 text-[14.5px] text-foreground/55 leading-5.75">
					{beat.aside}
				</AppText>
			</Animated.View>

			{/* Floor. The figure sits on the real fire rather than beside a drawn one. */}
			<View className="min-h-6 flex-1" />

			<Animated.View
				className="items-center"
				entering={reduced ? undefined : FadeIn.delay(4 * STEP).duration(700)}
				pointerEvents="none"
			>
				{/* Dropped to the floor so the drawn fire lands where the footage is still
				    bright. */}
				<Image
					contentFit="contain"
					source={require("@/assets/images/flux/flux-campfire.png")}
					style={styles.figure}
				/>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	figure: { height: 248, width: 186 },
});
