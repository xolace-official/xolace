import { Pressable, View } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import type { ViewStyle, TextStyle } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import { PresenceDot } from "@/src/features/reflect/components/presence-dot";
import { MicButton } from "@/src/features/reflect/components/mic-button";
import { Tour } from "@/src/components/ui/tour";
import { TOUR_STEPS } from "@/src/features/reflect/tour-copy";
import type { CardContent } from "@/src/features/reflect/compose/resolve-card-content";
import { a11yHidden } from "@/src/lib/utils";

/**
 * The resting card is a fixed 3:4 page with `overflow: hidden`, so a long
 * prompt — or a retained draft's opening line, which is arbitrary user text —
 * ran under the selection echo and was cut mid-glyph. Capped only at rest:
 * open, the card is full-width and the line has room to say everything.
 */
const REST_PROMPT_LINES = 4;

type Props = {
  card: CardContent;
  expanded: boolean;
  isRecording: boolean;
  controlsStyle: AnimatedStyle<ViewStyle>;
  promptStyle: AnimatedStyle<TextStyle>;
  onDismiss: () => void;
  onVoiceTap: () => void;
};

/**
 * The card's top row: the prompt, with the composer's controls arriving
 * around it as the card opens.
 */
export const MorphCardHeader = ({
  card,
  expanded,
  isRecording,
  controlsStyle,
  promptStyle,
  onDismiss,
  onVoiceTap,
}: Props) => {
  // The card is one object at two sizes, so both readings are always mounted.
  // Whichever one `progress` has faded out has to leave the a11y tree with it,
  // or a screen reader finds a close button for a composer that isn't open.
  const composerA11y = a11yHidden(!expanded);
  const pointer = expanded ? "auto" : "none";
  // A retained draft is the user's own words, not the space's — italic and
  // dimmer so the card never reads as if it asked the question.
  const isDraft = card.source === "draft";

  return (
    <View className="flex-row items-center gap-2">
      <Animated.View style={controlsStyle}>
        <PresenceDot />
      </Animated.View>
      {/* The prompt is the card's own voice and stays visible while writing,
          so the tour's first step is about the line rather than the page. */}
      <Tour.Step
        order={0}
        title={TOUR_STEPS[0].title}
        description={TOUR_STEPS[0].description}
        className="flex-1"
      >
        <Animated.Text
          style={promptStyle}
          numberOfLines={expanded ? undefined : REST_PROMPT_LINES}
          className={
            isDraft
              ? "font-normal italic text-foreground/60"
              : "font-normal text-foreground"
          }
        >
          {card.text}
        </Animated.Text>
      </Tour.Step>
      <Animated.View style={controlsStyle} pointerEvents={pointer} {...composerA11y}>
        <MicButton size="sm" isRecording={isRecording} onPress={onVoiceTap} />
      </Animated.View>
      <Animated.View style={controlsStyle} pointerEvents={pointer} {...composerA11y}>
        <Pressable
          onPress={() => {
            playSoftPress();
            onDismiss();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close the composer"
          className="items-center justify-center rounded-full bg-foreground/8 p-1.5"
        >
          <AppText className="text-xs leading-none text-foreground/40">✕</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
};
