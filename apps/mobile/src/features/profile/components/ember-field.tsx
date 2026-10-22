import { useEffect, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { BlurMask, Canvas, Circle, Group } from "@shopify/react-native-skia";
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTokenColor } from "../hooks/use-token-color";

const DOT_COUNT = 56;
const CANVAS_H = 30;
const DOT_R = 1.6;
const EMBER_R = 4.6;
const IGNITE_DELAY = 420;

type Props = {
  /**
   * 0–99 drives the horizontal position of the lit ember. `null` draws the
   * field unlit — no ember anywhere. That is the honest form of "not yet":
   * there is no number to fog, because the number does not exist. (Contrast
   * with the paywalled cards, which blur real content behind a gate.)
   */
  percentile: number | null;
};

/**
 * The field of embers: a band of dim, uniform dots — other people's fires in
 * the dark — with the user's own ember lit at their percentile position.
 *
 * Deliberately unlabelled: no axis, no ticks, no brighter-is-better gradient.
 * Every other fire is drawn identically, so the field never ranks anyone; the
 * only thing that carries the number is *where* the lit ember sits.
 */
export function EmberField({ percentile }: Props) {
  const [width, setWidth] = useState(0);
  const muted = useTokenColor("muted");
  const ember = useTokenColor("ember");
  const reduceMotion = useReducedMotion();

  // The ember ignites rather than travels — a moving dot would read as a
  // progress bar, i.e. as a race against the other fires.
  const emberR = useSharedValue(reduceMotion ? EMBER_R : EMBER_R * 0.35);
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      emberR.set(EMBER_R);
      breath.set(1);
      return;
    }
    emberR.set(
      withDelay(IGNITE_DELAY, withSpring(EMBER_R, { damping: 9, stiffness: 140 })),
    );
    breath.set(
      withDelay(
        IGNITE_DELAY,
        withRepeat(
          withTiming(0.72, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        ),
      ),
    );
  }, [reduceMotion, emberR, breath]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const spacing = width / DOT_COUNT;
  const lit = percentile !== null;
  const emberIndex = lit ? Math.round((percentile / 100) * (DOT_COUNT - 1)) : -1;
  const emberX = spacing * (emberIndex + 0.5);
  const cy = CANVAS_H / 2;

  return (
    <View onLayout={onLayout} style={{ height: CANVAS_H }}>
      {width > 0 && (
        <Canvas style={{ width, height: CANVAS_H }}>
          {Array.from({ length: DOT_COUNT }, (_, i) =>
            i === emberIndex ? null : (
              <Circle
                key={i}
                cx={spacing * (i + 0.5)}
                cy={cy}
                r={DOT_R}
                color={muted + "2E"}
              />
            ),
          )}

          {lit && (
            <Group opacity={breath}>
              <Circle cx={emberX} cy={cy} r={emberR} color={ember}>
                <BlurMask blur={7} style="solid" />
              </Circle>
            </Group>
          )}
        </Canvas>
      )}
    </View>
  );
}
