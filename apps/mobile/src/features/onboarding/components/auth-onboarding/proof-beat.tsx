/** The proof beat: the only composition whose subject is other people. */

import { SymbolView } from "expo-symbols";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import type { StoryBeat } from "@/features/onboarding/story-beats";
import { useDeckColor } from "./deck-color";
import { EmberField, VOICED } from "./ember-field";

// TODO(#200): real weekly cohort count. Inherits Discovery's rule: real matches only,
// and below a floor of three there is no number and no field of embers.
const COUNT = 22;

const REVIEW = {
	author: "RosieeeBD",
	quote:
		"I’ve always hated opening up to someone because I feel like I’d be laughed at or ignored. I also always assume I wouldn’t know where to start from if I’m to open up to someone. Just a few days on Xolace and I’ve realized that I don’t really need a lot of words to express myself.",
	source: "App Store, May 2026",
	title: "Slowly becoming my comfort app",
};

/** Matches every other beat's cadence. */
const STEP = 95;
const DUR = 520;

const FIELD_MIN = 118;
const FIELD_MAX = 168;
/** px-9 on both sides. */
const GUTTER = 36 * 2;
/** Gap between the last ember and the top of the quote. */
const DROP = 18;

export const ProofBeat = ({ beat }: { beat: StoryBeat }) => {
	const ember = useDeckColor("ember");
	const reduced = useReducedMotion();
	const { width, height } = useWindowDimensions();

	const fieldW = width - GUTTER;
	// Proportional: the tallest beat in the deck must fit the quote on a short phone.
	const fieldH = Math.min(FIELD_MAX, Math.max(FIELD_MIN, height * 0.17));

	// The voiced ember in points; the rule and the quote both hang off it.
	const voicedX = VOICED.x * fieldW;
	const voicedY = VOICED.y * fieldH;

	const enter = (index: number) =>
		reduced ? undefined : FadeInDown.delay(index * STEP).duration(DUR);

	return (
		<View className="flex-1 justify-center px-9 pb-10">
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

			<View className="mt-6">
				<EmberField
					color={ember}
					count={COUNT}
					height={fieldH}
					width={fieldW}
				/>

				{/* The rule from the ember's centre down the quote, faded at the top by the
				    halo. */}
				<Animated.View
					className="absolute bottom-0 w-px rounded-full"
					entering={reduced ? undefined : FadeInDown.delay(1600).duration(700)}
					pointerEvents="none"
					style={{
						backgroundColor: `${ember}4d`,
						left: voicedX,
						top: voicedY,
					}}
				/>

				<Animated.View
					className="gap-1.5"
					entering={reduced ? undefined : FadeInDown.delay(1700).duration(700)}
					style={{ marginTop: DROP, paddingLeft: voicedX + 14 }}
				>
					<AppText className="font-poppins-medium text-[14px] text-foreground/90 leading-5">
						{REVIEW.title}
					</AppText>

					{/* A step smaller than the deck's body copy: at 14px three sentences run
					    eleven lines. */}
					<AppText className="text-[12.5px] text-foreground/70 leading-4.75">
						{`“${REVIEW.quote}”`}
					</AppText>

					<AppText className="mt-0.5 text-[11.5px] text-foreground/38">
						{`${REVIEW.author} · ${REVIEW.source}`}
					</AppText>
				</Animated.View>
			</View>

			{/* The count arrives last, as a caption on the picture. */}
			<Animated.View className="mt-7" entering={enter(6)}>
				<AppText className="text-[14px] text-foreground/70 leading-6">
					<AppText
						className="font-poppins-medium"
						style={{ color: ember }}
					>{`${COUNT} people`}</AppText>
					{
						" sat by the fire this week — each one alone, none of them the only one."
					}
				</AppText>
				<AppText className="mt-1.5 pr-4 text-[12px] text-foreground/38 leading-5">
					{beat.aside}
				</AppText>
			</Animated.View>
		</View>
	);
};
