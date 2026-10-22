import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import {
  HANDOFF,
  useMorphGeometry,
} from "@/src/features/reflect/compose/morph-geometry";
import type { CardContent } from "@/src/features/reflect/compose/resolve-card-content";

/** Prompt type scale, resting → composing, per card content scale. */
const PROMPT_SIZE = {
  large: [21, 14],
  small: [17, 13],
} as const;

/**
 * Every animated style the card reads off `progress` (#256).
 *
 * The bottom edge tracks the keyboard's real animated height rather than a
 * guessed endpoint, so the card never grows under it.
 */
export const useMorphCardStyles = (
  progress: SharedValue<number>,
  fade: SharedValue<number>,
  scale: CardContent["scale"],
) => {
  const geo = useMorphGeometry();
  const { height: kb } = useReanimatedKeyboardAnimation();
  const [restSize, expandedSize] = PROMPT_SIZE[scale];

  const expH = useDerivedValue(() => {
    const kbH = -kb.get();
    const bottom =
      geo.H - geo.insetTop - (kbH > 0 ? kbH + 12 : geo.insetBottom + 16);
    return bottom - geo.expTop;
  });

  const cardStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: fade.get(),
      top: interpolate(p, [0, 1], [geo.restTop, geo.expTop]),
      left: interpolate(p, [0, 1], [geo.restLeft, geo.expLeft]),
      width: interpolate(p, [0, 1], [geo.restW, geo.expW]),
      height: interpolate(p, [0, 1], [geo.restH, expH.get()]),
      borderRadius: interpolate(p, [0, 1], [16, 32]),
      transform: [{ rotateZ: `${interpolate(p, [0, 1], [-4, 0])}deg` }],
    };
  });

  const promptStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(progress.get(), [0, 1], [restSize, expandedSize]),
    opacity: interpolate(progress.get(), [0, 1], [1, 0.45]),
  }));

  // The composer's controls arrive with the card, so it reads as one object
  // rather than as a page with parts assembled onto it.
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [HANDOFF, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Discard is the resting card's counterpart to the composer's close button —
  // same corner, opposite half of the morph, so the card never offers both.
  const restControlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, HANDOFF],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.4, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // The tapped words hand over to the text input as the card opens — one
  // answer surface, not two. Absolute so the expanded card's layout never
  // reserves room for a thing it isn't showing.
  const echoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));

  return {
    cardStyle,
    promptStyle,
    controlsStyle,
    restControlsStyle,
    bodyStyle,
    echoStyle,
  };
};
