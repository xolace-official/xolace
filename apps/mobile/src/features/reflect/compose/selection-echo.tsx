import { View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import {
  TEXTURE_PILL,
  textureHue,
} from "@/src/features/reflect/texture-sets";

// Barely-there overshoot: the word settles into the card, it doesn't land on a
// trampoline.
const ARRIVE = FadeInDown.springify().damping(30).stiffness(180);
const LEAVE = FadeOut.duration(140);
const REFLOW = LinearTransition.springify().damping(30).stiffness(180);

type Props = {
  words: string[];
};

/**
 * What you tapped, pooled at the bottom of the card.
 *
 * Tapping a texture word is answering the card's question, so the answer
 * belongs in the card — the same place typing would put it, and literally what
 * gets sent (the machine joins these words into the raw input). Keeping the
 * selection here rather than under the band is also what lets the band hold a
 * fixed frame: nothing below the card grows when a word is chosen.
 *
 * Read-only by design. The card's own tap target covers this at rest, and
 * removing a word means untapping its pill, which is where the eye already is.
 */
export const SelectionEcho = ({ words }: Props) => (
  <View className="flex-row flex-wrap gap-1.5">
    {words.map((word) => {
      // The word keeps the colour it had in the band, so the eye can follow it
      // from the grid into the card.
      const skin = TEXTURE_PILL[textureHue(word)];
      return (
        <Animated.View
          key={word}
          entering={ARRIVE}
          exiting={LEAVE}
          layout={REFLOW}
          className={cn("rounded-full px-2.5 py-1", skin.echo)}
        >
          <AppText className={cn("text-xs", skin.label)}>{word}</AppText>
        </Animated.View>
      );
    })}
  </View>
);
