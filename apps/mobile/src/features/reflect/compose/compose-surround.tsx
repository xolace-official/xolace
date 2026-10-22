import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { IdleMenu } from "@/src/features/idle-menu/menu";
import { ComposeChrome } from "@/src/features/reflect/compose/compose-chrome";
import {
  ComposeSlot,
  SLOT_BAND_GAP,
  SLOT_H,
} from "@/src/features/reflect/compose/compose-slot";
import { useMorphGeometry } from "@/src/features/reflect/compose/morph-geometry";
import { TextureBand } from "@/src/features/reflect/compose/texture-band";
import type { ReflectionAction, UserVariant } from "@/src/features/reflect/types";
import { a11yHidden } from "@/src/lib/utils";

type Props = {
  progress: SharedValue<number>;
  /** The reduced-motion cross-fade's opacity. 1 whenever motion is allowed. */
  fade: SharedValue<number>;
  expanded: boolean;
  reduceMotion: boolean;
  variant: UserVariant;
  isNight: boolean;
  eventPrompt: string | null;
  eventLabel: string | null;
  spaceName?: string;
  selectedTextures: string[];
  dispatch: React.Dispatch<ReflectionAction>;
  onScaffoldSubmit: () => void;
  onVoiceTap: () => void;
  isRecording: boolean;
};

/**
 * The page the card rests on: identity strip above, chips below, mic beside.
 *
 * All of it recedes as the card takes the screen — it is one object growing,
 * not a page gaining a panel. `fade` carries the surround through the
 * reduced-motion cross-fade too, where progress jumps rather than travels and
 * would otherwise cut these out in a single frame.
 */
export const ComposeSurround = ({
  progress,
  fade,
  expanded,
  reduceMotion,
  variant,
  isNight,
  eventPrompt,
  eventLabel,
  spaceName,
  selectedTextures,
  dispatch,
  onScaffoldSubmit,
  onVoiceTap,
  isRecording,
}: Props) => {
  const geo = useMorphGeometry();
  const rawHeaderHeight = useHeaderHeight();
  // Freeze the last known header height so it doesn't jump when the header
  // hides for the composer. Adjusting state during render (not in an effect) is
  // the supported pattern for retaining a value seen on a previous render.
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  if (rawHeaderHeight > 0 && rawHeaderHeight !== stableHeaderHeight) {
    setStableHeaderHeight(rawHeaderHeight);
  }

  const recede = useAnimatedStyle(() => ({
    opacity:
      fade.get() *
      interpolate(progress.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const bandStyle = useAnimatedStyle(() => ({
    opacity:
      fade.get() *
      interpolate(progress.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(progress.get(), [0, 0.6], [0, 40], Extrapolation.CLAMP),
      },
    ],
  }));

  const inFlow = expanded ? "none" : "auto";
  const overlay = expanded ? "none" : "box-none";
  // `recede` takes these to opacity 0, which a screen reader does not honour —
  // without this the whole texture band and a second mic stay swipe-reachable
  // behind the open composer.
  const receded = a11yHidden(expanded);
  const chromeStyle = {
    paddingTop: Math.max(0, stableHeaderHeight - geo.insetTop),
  };

  // The band is bottom-anchored and grows upward with the reader's text size,
  // so at large accessibility sizes it climbs into the slot parked under the
  // card. The card's geometry is where the slot wants to be; the band's
  // measured top is where it is still allowed to be — take whichever is higher.
  const [bandTop, setBandTop] = useState(0);
  const restingTop = geo.restTop + geo.restH + 20;
  const micStyle = {
    top: bandTop
      ? Math.min(restingTop, bandTop - SLOT_H - SLOT_BAND_GAP)
      : restingTop,
  };

  return (
    <>
      <Animated.View
        style={[chromeStyle, recede]}
        pointerEvents={inFlow}
        className="px-6 pt-4"
        {...receded}
      >
        <ComposeChrome
          variant={variant}
          eventPrompt={eventPrompt}
          eventLabel={eventLabel}
          spaceName={spaceName}
        />
      </Animated.View>

      <View className="flex-1" />

      <Animated.View
        style={bandStyle}
        pointerEvents={inFlow}
        onLayout={(e) => setBandTop(e.nativeEvent.layout.y)}
        {...receded}
      >
        <TextureBand
          isNight={isNight}
          selectedTextures={selectedTextures}
          dispatch={dispatch}
        />
      </Animated.View>

      <ComposeSlot
        expanded={expanded}
        hasSelection={selectedTextures.length > 0}
        isRecording={isRecording}
        style={[{ position: "absolute", left: 0, right: 0 }, micStyle, bandStyle]}
        onScaffoldSubmit={onScaffoldSubmit}
        onVoiceTap={onVoiceTap}
      />

      <Animated.View
        style={[StyleSheet.absoluteFill, recede]}
        pointerEvents={overlay}
        {...receded}
      >
        <IdleMenu />
      </Animated.View>
    </>
  );
};
