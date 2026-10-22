import { StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  type AnimatedStyle,
} from "react-native-reanimated";
import type { ViewStyle } from "react-native";
import { Tour } from "@/src/components/ui/tour";
import { MicButton } from "@/src/features/reflect/components/mic-button";
import { PillButton } from "@/src/components/shared/pill-button";
import { TOUR_STEPS } from "@/src/features/reflect/tour-copy";
import { a11yHidden } from "@/src/lib/utils";

const SLOT_IN = FadeIn.duration(220);
const SLOT_OUT = FadeOut.duration(140);

/** The mic/send slot's fixed height — `h-10` below. */
export const SLOT_H = 40;
/** The least room the slot will accept between itself and the first word. */
export const SLOT_BAND_GAP = 12;

type Props = {
  expanded: boolean;
  hasSelection: boolean;
  isRecording: boolean;
  /** Position and recede, from the surround that owns the band. */
  style: (AnimatedStyle<ViewStyle> | ViewStyle)[];
  onScaffoldSubmit: () => void;
  onVoiceTap: () => void;
};

/**
 * One slot under the card, for whichever way out is live.
 *
 * Empty-handed it is the mic; once words are chosen the card is already
 * holding the answer, so the same spot becomes the way to send it. Swapping in
 * place is what keeps the band's frame fixed — nothing below the card grows,
 * and the mic is never crowded out of its own position. It rides the band down
 * rather than just fading: either way it is the way out that isn't the card,
 * and a user who has committed to writing is not offered one.
 */
export const ComposeSlot = ({
  expanded,
  hasSelection,
  isRecording,
  style,
  onScaffoldSubmit,
  onVoiceTap,
}: Props) => (
  <Animated.View
    style={style}
    pointerEvents={expanded ? "none" : "box-none"}
    className="h-10 items-center justify-center"
    {...a11yHidden(expanded)}
  >
    {hasSelection ? (
      <Animated.View
        style={StyleSheet.absoluteFill}
        entering={SLOT_IN}
        exiting={SLOT_OUT}
        className="items-center justify-center"
      >
        {/* Sized to the mic it replaces, so the slot's height is constant. */}
        <PillButton
          label="Let it out"
          onPress={onScaffoldSubmit}
          className="px-6 py-2"
        />
      </Animated.View>
    ) : (
      <Animated.View
        style={StyleSheet.absoluteFill}
        entering={SLOT_IN}
        exiting={SLOT_OUT}
        className="items-center justify-center"
      >
        <Tour.Step
          order={1}
          title={TOUR_STEPS[1].title}
          description={TOUR_STEPS[1].description}
          shape="circle"
          className="self-center"
        >
          <MicButton size="md" isRecording={isRecording} onPress={onVoiceTap} />
        </Tour.Step>
      </Animated.View>
    )}
  </Animated.View>
);
