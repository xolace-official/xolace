import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";

// Cream-white from the design spec, a fixed artwork color on the dark ritual screen.
const TEXT_STYLE = { color: "#F5F0E8" };

type Props = {
	words: string;
};

/** The coda: acknowledgement words materialize word-by-word over ~500ms where
 * the particles were, with TTS alongside. The parent unmounts this at 'gone'. */
export function VentAcknowledgement({ words }: Props) {
	const tokens = words.split(/\s+/).filter(Boolean);
	const perWordDelay = tokens.length > 1 ? 500 / tokens.length : 0;
	// Words can repeat ("it goes it goes"), so position makes the key unique.
	const parts = tokens.map((word, position) => ({
		key: `${position}-${word}`,
		position,
		word,
	}));

	return (
		<View className="absolute inset-0 items-center justify-center px-12">
			<View className="flex-row flex-wrap justify-center gap-x-1.5 gap-y-1">
				{parts.map((part) => (
					<Animated.View
						entering={FadeIn.duration(260).delay(part.position * perWordDelay)}
						exiting={FadeOut.duration(600)}
						key={part.key}
					>
						<AppText className="font-normal text-[17px]" style={TEXT_STYLE}>
							{part.word}
						</AppText>
					</Animated.View>
				))}
			</View>
		</View>
	);
}
