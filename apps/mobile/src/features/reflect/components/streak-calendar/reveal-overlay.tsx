/**
 * Full-screen reveal: an absolute-positioned clone of the mini card
 * springs from the measured header position to screen center, flips
 * to the new day, blasts particles at the flip apex, shows the
 * per-day message, then collapses back on tap.
 *
 * The morph is transform-only (translate + scale from the measured
 * rect) — the card always lays out at FULL_SIZE, so no layout work
 * happens per frame.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type MeasuredDimensions,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { AppText } from "@/src/components/shared/app-text";
import { playSessionComplete } from "@/src/lib/haptics";
import { getStreakCopy } from "@/src/features/reflect/streak-copy";
import { BlastParticles, type BlastParticlesRef } from "./blast-particles";
import {
  BLAST_SPRING,
  FLIP_SPRING,
  FULL_SIZE,
  getCardMetrics,
  MORPH_SPRING,
  type CardColors,
} from "./constants";
import { StreakFlipCard } from "./streak-flip-card";

const FULL_METRICS = getCardMetrics(FULL_SIZE);
const BLAST_CANVAS_SIZE = FULL_SIZE * 2.4;

type Props = {
  /** The new streak day being revealed */
  day: number;
  /** Measured screen rect of the mini card */
  miniLayout: MeasuredDimensions;
  colors: CardColors;
  /** Called after the collapse spring completes */
  onDismissed: () => void;
};

export const RevealOverlay = ({ day, miniLayout, colors, onDismissed }: Props) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const morphProgress = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const blastRef = useRef<BlastParticlesRef>(null);

  const [canDismiss, setCanDismiss] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  // Skia canvas + texture are expensive to mount — deferred until the
  // morph completes so they don't steal frames from the expand spring.
  // The blast isn't needed until the flip apex, well after that.
  const [blastReady, setBlastReady] = useState(false);

  const message = getStreakCopy(day);
  const previousDay = Math.max(day - 1, 0);

  // Final resting place of the full-size card (slightly above center
  // so the message has room below).
  const targetX = (windowWidth - FULL_SIZE) / 2;
  const targetY = windowHeight * 0.5 - FULL_SIZE * 0.65;

  // Transform deltas from the measured mini rect to the target rect
  const startScale = miniLayout.width / FULL_SIZE;
  const deltaX =
    miniLayout.pageX + miniLayout.width / 2 - (targetX + FULL_SIZE / 2);
  const deltaY =
    miniLayout.pageY + miniLayout.height / 2 - (targetY + FULL_SIZE / 2);

  // Expand, then flip. The expand spring callback runs on the UI
  // thread, so chaining the flip there avoids a JS round-trip.
  // The spring start is pushed past the overlay's first paint (double
  // rAF) — kicking it off on the mount frame drops the early frames.
  useEffect(() => {
    const onFlipDone = () => {
      setShowMessage(true);
      setCanDismiss(true);
    };
    let rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        morphProgress.set(
          withSpring(1, MORPH_SPRING, (morphDone) => {
            "worklet";
            if (!morphDone) return;
            scheduleOnRN(setBlastReady, true);
            flipProgress.set(
              withSpring(1, FLIP_SPRING, (flipDone) => {
                "worklet";
                if (flipDone) scheduleOnRN(onFlipDone);
              }),
            );
          }),
        );
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [morphProgress, flipProgress, setBlastReady]);

  // Fire blast + haptic exactly once at the flip apex
  const handleApex = () => {
    blastRef.current?.blast(BLAST_SPRING);
    // A streak reveal is the app's celebration moment — particle blast and all.
    // It used to share resonanceToggle with starring a quote and toggling a peer
    // resonance, so the milestone landed no heavier than a list tap.
    playSessionComplete();
  };

  useAnimatedReaction(
    () => flipProgress.get(),
    (current, previous) => {
      if (previous !== null && previous < 0.5 && current >= 0.5) {
        scheduleOnRN(handleApex);
      }
    },
  );

  const handleDismiss = () => {
    if (!canDismiss) return;
    setCanDismiss(false);
    setShowMessage(false);
    morphProgress.set(
      withSpring(0, MORPH_SPRING, (collapsed) => {
        "worklet";
        if (collapsed) scheduleOnRN(onDismissed);
      }),
    );
  };

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: morphProgress.get(),
  }));

  const rCardStyle = useAnimatedStyle(() => {
    const progress = morphProgress.get();
    return {
      transform: [
        { translateX: interpolate(progress, [0, 1], [deltaX, 0]) },
        { translateY: interpolate(progress, [0, 1], [deltaY, 0]) },
        { scale: interpolate(progress, [0, 1], [startScale, 1]) },
      ],
    };
  });

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={handleDismiss}
      accessibilityLabel={`Day ${day} streak. Tap to continue`}
    >
      <Animated.View
        style={rBackdropStyle}
        className="absolute inset-0 bg-black/50"
      />

      {blastReady && (
        <View
          pointerEvents="none"
          style={[
            styles.blastContainer,
            {
              left: targetX + FULL_SIZE / 2 - BLAST_CANVAS_SIZE / 2,
              top: targetY + FULL_SIZE / 2 - BLAST_CANVAS_SIZE / 2,
            },
          ]}
        >
          <BlastParticles
            ref={blastRef}
            size={BLAST_CANVAS_SIZE}
            count={24}
            circleRadius={3}
            color={colors.header}
            blastRadius={FULL_SIZE * 0.95}
          />
        </View>
      )}

      <Animated.View
        style={[rCardStyle, styles.card, { left: targetX, top: targetY }]}
      >
        <StreakFlipCard
          day={day}
          previousDay={previousDay}
          flipProgress={flipProgress}
          metrics={FULL_METRICS}
          colors={colors}
        />
      </Animated.View>

      {showMessage && message && (
        <Animated.View
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(150)}
          style={[styles.message, { top: targetY + FULL_SIZE + 28 }]}
        >
          <AppText className="text-center text-base text-white/90">
            {message}
          </AppText>
        </Animated.View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  blastContainer: {
    height: BLAST_CANVAS_SIZE,
    position: "absolute",
    width: BLAST_CANVAS_SIZE,
  },
  card: {
    position: "absolute",
  },
  message: {
    left: 32,
    position: "absolute",
    right: 32,
  },
});
