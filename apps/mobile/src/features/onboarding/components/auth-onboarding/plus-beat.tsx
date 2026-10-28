/** The Xolace+ beat: the only one that sells. */

import { SymbolView } from "expo-symbols";
import { View } from "react-native";
import Animated, {
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import type { StoryBeat } from "@/features/onboarding/story-beats";
import { useDeckColor } from "./deck-color";
import { PatternLine } from "./pattern-line";

const EXTRAS = [
	{
		id: "history",
		label: "Full history",
		symbol: {
			android: "history",
			ios: "clock.arrow.circlepath",
			web: "history",
		},
	},
	{
		id: "look",
		label: "Themes & avatars",
		symbol: { android: "palette", ios: "paintpalette", web: "palette" },
	},
	{
		id: "drafts",
		label: "More drafts a day",
		symbol: {
			android: "edit_note",
			ios: "square.and.pencil",
			web: "edit_note",
		},
	},
] as const;

/** Matches the cover, Mirror, Vent and Xolacers so all five share a cadence. */
const STEP = 95;
const DUR = 520;

export const PlusBeat = ({ beat }: { beat: StoryBeat }) => {
	const ember = useDeckColor("ember");
	const reduced = useReducedMotion();

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

			<Animated.View entering={enter(2)}>
				<AppText className="mt-5 pr-4 text-[14px] text-foreground/42 leading-6">
					{beat.aside}
				</AppText>
			</Animated.View>

			<Animated.View className="mt-4" entering={enter(3)}>
				<PatternLine />
			</Animated.View>

			<Animated.View className="mt-2" entering={enter(4)}>
				<AppText className="mb-2.5 text-[9.5px] text-foreground/30 uppercase tracking-[1.8px]">
					Also with Plus
				</AppText>
				<View className="flex-row flex-wrap gap-2">
					{EXTRAS.map((extra) => (
						<View
							className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
							key={extra.id}
							style={{ borderColor: `${ember}2e` }}
						>
							<SymbolView
								name={extra.symbol}
								size={12}
								tintColor={ember}
								type="hierarchical"
							/>
							<AppText className="text-[11.5px] text-foreground/70">
								{extra.label}
							</AppText>
						</View>
					))}
				</View>
			</Animated.View>

			{beat.tag ? (
				<Animated.View className="mt-6 flex-row gap-3" entering={enter(5)}>
					<View
						className="w-0.5 rounded-full"
						style={{ backgroundColor: `${ember}59` }}
					/>
					<AppText className="flex-1 text-[12.5px] text-foreground/65 leading-5">
						{beat.tag}
					</AppText>
				</Animated.View>
			) : null}
		</View>
	);
};
