import { Dimensions, StyleSheet, View } from "react-native";

import React, { useCallback, useImperativeHandle, use } from "react";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Keyframe,
  LinearTransition,
  useAnimatedRef,
  measure,
  useDerivedValue,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { useThemeColor } from "heroui-native";

import { TrayContext } from "./tray-context";
import { useKeyboardOffset } from "./use-keyboard-offset";
import { TrayHeader } from "./tray-header";
import { TrayBackdrop } from "./tray-backdrop";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Spacing/radius constants (replaces the sample's theme-object indirection).
const SPACING_XXL = 48;
const RADIUS_LG = 32;

// Spring + keyframe constants — keep consistent across open/close/layout.
const SPRING_DAMPING = 25;
const SPRING_STIFFNESS = 300;
const SPRING_MASS = 0.6;
const KEYFRAME_DURATION = 120;

const TimingKeyframeEntering = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }, { translateY: 5 }] },
  50: { opacity: 0.2, transform: [{ scale: 0.98 }, { translateY: 5 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
}).duration(KEYFRAME_DURATION);

const TimingKeyframeExiting = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  50: { opacity: 0.2, transform: [{ scale: 0.98 }, { translateY: -5 }] },
  100: { opacity: 0, transform: [{ scale: 0.92 }, { translateY: -5 }] },
}).duration(KEYFRAME_DURATION);

const LayoutSpring = LinearTransition.springify()
  .damping(SPRING_DAMPING)
  .stiffness(SPRING_STIFFNESS)
  .mass(SPRING_MASS);

type ActionTrayProps = {
  children?: React.ReactNode;
  maxHeight?: number;
};

/**
 * The floating reanimated sheet. Drag-to-dismiss + spring open/close, rides up
 * with the keyboard, and animates height between a short menu and a tall form.
 * Theme is read from `useThemeColor("surface")` rather than a static palette.
 */
export const ActionTray = ({
  children,
  maxHeight = SCREEN_HEIGHT,
}: ActionTrayProps) => {
  const { state, actions, meta } = use(TrayContext);
  const surfaceColor = useThemeColor("surface") as string;
  const translateY = useSharedValue(maxHeight);
  const animatedTrayRef = useAnimatedRef();
  const { translateY: keyboardTranslateY } = useKeyboardOffset();

  const scrollTo = useCallback(
    (destination: number) => {
      "worklet";
      translateY.set(
        withSpring(destination, {
          mass: SPRING_MASS,
          damping: SPRING_DAMPING,
          stiffness: SPRING_STIFFNESS,
        }),
      );
    },
    [translateY],
  );

  const closeAction = useCallback(() => {
    "worklet";
    state.isActive.set(false);
    const measurements = measure(animatedTrayRef);
    const projectedHeight = measurements?.height
      ? measurements.height + SPACING_XXL
      : maxHeight;
    return scrollTo(projectedHeight);
  }, [scrollTo, state.isActive, animatedTrayRef, maxHeight]);

  const close = useCallback(() => {
    "worklet";
    return scheduleOnUI(closeAction);
  }, [closeAction]);

  useImperativeHandle(
    meta.trayRef,
    () => ({
      open: () => {
        "worklet";
        state.isActive.set(true);
        scrollTo(0);
      },
      close,
      isActive: () => {
        return state.isActive.get();
      },
    }),
    [close, scrollTo, state.isActive],
  );

  const context = useSharedValue({ y: 0 });
  const gesture = Gesture.Pan()
    .onBegin(() => {
      context.set({ y: translateY.get() });
    })
    .onUpdate((event) => {
      if (event.translationY > -50) {
        translateY.set(event.translationY + context.get().y);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        scheduleOnRN(actions.dismiss);
      } else {
        scrollTo(context.get().y);
      }
    });

  const adjustedTranslateY = useDerivedValue(() => {
    return translateY.get() + keyboardTranslateY.get();
  });

  const rTranslateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: adjustedTranslateY.get() }],
    };
  });

  return (
    <>
      <TrayBackdrop />
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.container,
            styles.rounded,
            { backgroundColor: surfaceColor },
            rTranslateStyle,
          ]}
          layout={LayoutSpring}
          ref={animatedTrayRef}
        >
          <TrayHeader />
          <Animated.View
            entering={TimingKeyframeEntering}
            exiting={TimingKeyframeExiting}
            key={
              state.currentScreen
                ? `${String(state.currentScreen)}-visible`
                : "default-visible"
            }
            style={styles.contentContainer}
          >
            {children}
          </Animated.View>

          <View style={styles.footerSpacing} />
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderCurve: "continuous",
    bottom: 32,
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingHorizontal: 16,
    position: "absolute",
    width: "94%",
  },
  contentContainer: {
    paddingBottom: 24,
    paddingTop: 4,
  },
  footerSpacing: {
    bottom: -148,
    height: 150,
    left: 0,
    position: "absolute",
    right: 0,
  },
  rounded: {
    borderCurve: "continuous",
    borderRadius: RADIUS_LG,
  },
});
