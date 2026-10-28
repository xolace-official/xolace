import { View } from "react-native";
import Animated, {
	FadeInDown,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { TEXTURE_PILL, textureHue } from "@/features/reflect/texture-sets";
import { cn } from "@/lib/utils";

// Barely-there overshoot: the word settles into the card.
const ARRIVE = FadeInDown.springify().damping(30).stiffness(180);
const LEAVE = FadeOut.duration(140);
const REFLOW = LinearTransition.springify().damping(30).stiffness(180);

type Props = {
	words: string[];
};

/**
 * The tapped words, pooled at the bottom of the card. Read-only: untap the pill to remove a word.
 */
export const SelectionEcho = ({ words }: Props) => (
	<View className="flex-row flex-wrap gap-1.5">
		{words.map((word) => {
			// The word keeps the colour it had in the band.
			const skin = TEXTURE_PILL[textureHue(word)];
			return (
				<Animated.View
					className={cn("rounded-full px-2.5 py-1", skin.echo)}
					entering={ARRIVE}
					exiting={LEAVE}
					key={word}
					layout={REFLOW}
				>
					<AppText className={cn("text-xs", skin.label)}>{word}</AppText>
				</Animated.View>
			);
		})}
	</View>
);
