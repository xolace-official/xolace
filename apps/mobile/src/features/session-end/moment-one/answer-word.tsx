import { View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { BODY_MAX_SCALE, FONTS } from "@/design/type";
import { LAYOUT, SLIDER } from "../session-look";

const W = LAYOUT.word;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** Board `wsw`: a new word fades in and rises 8 pt over .24 s. */
const SWAP = new Keyframe({
	0: { opacity: 0, transform: [{ translateY: SLIDER.word.rise }] },
	100: { easing: EASE, opacity: 1, transform: [{ translateY: 0 }] },
}).duration(SLIDER.word.ms);
const SWAP_REDUCED = new Keyframe({
	0: { opacity: 0 },
	100: { opacity: 1 },
}).duration(SLIDER.word.ms);

/**
 * Board `.wd`: the word under the face, Newsreader italic 30/38 in ink; before
 * an answer "Slide to answer" at 24 in ink 3. Each new step swaps it (a fade
 * and an 8 pt rise). Hidden from VoiceOver: the slider's value says it.
 */
export function AnswerWord({
	word,
	answered,
	reduced,
}: {
	word: string;
	answered: boolean;
	reduced: boolean;
}) {
	return (
		<View
			accessibilityElementsHidden
			className="items-center justify-center"
			importantForAccessibility="no-hide-descendants"
			style={{ minHeight: W.height }}
		>
			<Animated.View entering={reduced ? SWAP_REDUCED : SWAP} key={word}>
				<AppText
					center
					color={answered ? "foreground" : "subtle"}
					maxFontSizeMultiplier={BODY_MAX_SCALE}
					style={{
						fontFamily: FONTS.mirror,
						fontSize: answered ? W.size : W.idle,
						lineHeight: W.height,
					}}
					variant="body"
				>
					{word}
				</AppText>
			</Animated.View>
		</View>
	);
}
