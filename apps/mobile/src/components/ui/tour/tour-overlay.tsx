import { useState } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";

import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { TourBackdrop } from "@/src/components/ui/tour/tour-backdrop";
import { TourCard } from "@/src/components/ui/tour/tour-card";
import { cardFrame } from "@/src/components/ui/tour/geometry";
import { useSpotlight } from "@/src/components/ui/tour/use-spotlight";
import type {
  TourLabels,
  TourPlacement,
  TourShape,
  TourStepEntry,
} from "@/src/components/ui/tour/types";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  active: TourStepEntry | undefined;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  padding: number;
  radius: number;
  shape: TourShape;
  placement: TourPlacement;
  dismissible: boolean;
  showProgress: boolean;
  showSkip: boolean;
  interactive: boolean;
  overlayColor: string;
  reducedMotion: boolean;
  words: Required<TourLabels>;
  cardClassName?: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

export const TourOverlay = ({
  active,
  index,
  total,
  isFirst,
  isLast,
  padding,
  radius,
  shape,
  placement,
  dismissible,
  showProgress,
  showSkip,
  interactive,
  overlayColor,
  reducedMotion,
  words,
  cardClassName,
  onNext,
  onBack,
  onSkip,
}: Props) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { spot, pathProps } = useSpotlight({
    active,
    shape: active?.shape ?? shape,
    padding: active?.padding ?? padding,
    radius: active?.radius ?? radius,
    reducedMotion,
    screenWidth,
    screenHeight,
  });

  const [cardHeight, setCardHeight] = useState<number | null>(null);

  // The card is keyed on the step and remounts with it, but its height lives
  // here — so without this the next step is placed by the previous card's
  // height, visible at full opacity, until its own layout lands a frame later.
  // Dropped during render for the same reason TourRoot resets the step there.
  const [measuredOrder, setMeasuredOrder] = useState(active?.order);
  if (measuredOrder !== active?.order) {
    setMeasuredOrder(active?.order);
    setCardHeight(null);
  }

  /*
   * A step with no measurable target — a welcome card, or one whose control has
   * gone — gets no hole and a card in the middle of the screen. Dimming the
   * whole screen and saying nothing about where to look is honest; cutting a
   * hole at the origin is not.
   */
  const card = cardFrame({
    spot,
    cardHeight,
    placement: active?.placement ?? placement,
    screenWidth,
    screenHeight,
    insets,
  });

  const onCardLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    setCardHeight((current) =>
      current !== null && Math.abs(current - measured) < 1 ? current : measured,
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/*
        The dim is one path with a hole in it and takes no touches, so what
        handles them is the layer under it. That layer is a full-screen
        responder normally and a ring of four around the cutout when the target
        is meant to stay usable — the hole is the gap between them, which is
        the only way to leave a rectangle of the screen pressable.
      */}
      <TourBackdrop
        interactive={interactive}
        dismissible={dismissible}
        spot={spot}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        onDismiss={onSkip}
      />

      <Animated.View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        entering={reducedMotion ? undefined : FadeIn.duration(180)}
        exiting={reducedMotion ? undefined : FadeOut.duration(140)}
      >
        <Svg width={screenWidth} height={screenHeight}>
          <AnimatedPath
            animatedProps={pathProps}
            fill={overlayColor}
            fillRule="evenodd"
          />
        </Svg>
      </Animated.View>

      {/*
       * Two views, and the split is not cosmetic. The entering animation drives
       * opacity, and so does the gate that hides the card for the frame it is
       * being measured in — put on one view they fight, and Reanimated says so:
       * a layout animation may overwrite a property the style also sets, and
       * which of them wins is not something to rely on. The outer view owns the
       * animation and the placement; the card owns the measurement and the gate.
       */}
      <Animated.View
        key={active?.order ?? "none"}
        entering={reducedMotion ? undefined : FadeIn.duration(200)}
        style={[
          styles.cardPosition,
          { left: card.left, top: card.top, width: card.width },
        ]}
      >
        <TourCard
          active={active}
          index={index}
          total={total}
          isFirst={isFirst}
          isLast={isLast}
          measured={cardHeight !== null}
          dismissible={dismissible}
          showProgress={showProgress}
          showSkip={showSkip}
          words={words}
          className={cardClassName}
          onLayout={onCardLayout}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardPosition: { position: "absolute" },
});
