import { useRef } from "react";
import { type GestureResponderEvent, StyleSheet, View } from "react-native";

import type { Rect } from "@/src/components/ui/tour/types";

/** How far a touch may travel and still count as a tap, not a swipe. */
const TAP_SLOP = 10;

type Props = {
  interactive: boolean;
  dismissible: boolean;
  spot: Rect | null;
  screenWidth: number;
  screenHeight: number;
  onDismiss: () => void;
};

/**
 * The layer that takes the touches the dim does not.
 *
 * One full-screen responder, or four around the cutout when the target has to
 * stay usable. Four rather than one with a hole, because a view cannot have a
 * hole — the gap between them is the hole, and it is the only construction
 * that leaves a rectangle of the screen reachable.
 */
export const TourBackdrop = ({
  interactive,
  dismissible,
  spot,
  screenWidth,
  screenHeight,
  onDismiss,
}: Props) => {
  const start = useRef({ x: 0, y: 0 });

  const press = dismissible
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: (e: GestureResponderEvent) => {
          start.current = {
            x: e.nativeEvent.pageX,
            y: e.nativeEvent.pageY,
          };
        },
        onResponderRelease: (e: GestureResponderEvent) => {
          const { pageX, pageY } = e.nativeEvent;
          if (
            Math.abs(pageX - start.current.x) <= TAP_SLOP &&
            Math.abs(pageY - start.current.y) <= TAP_SLOP
          ) {
            onDismiss();
          }
        },
      }
    : { onStartShouldSetResponder: () => true };

  if (!interactive || !spot) {
    return <View style={StyleSheet.absoluteFill} {...press} />;
  }

  const bottom = spot.y + spot.height;
  const right = spot.x + spot.width;

  return (
    <>
      <View
        style={[styles.top, { height: Math.max(0, spot.y) }]}
        {...press}
      />
      <View
        style={[
          styles.bottom,
          { top: bottom, height: Math.max(0, screenHeight - bottom) },
        ]}
        {...press}
      />
      <View
        style={[
          styles.left,
          { top: spot.y, width: Math.max(0, spot.x), height: spot.height },
        ]}
        {...press}
      />
      <View
        style={[
          styles.right,
          {
            left: right,
            top: spot.y,
            width: Math.max(0, screenWidth - right),
            height: spot.height,
          },
        ]}
        {...press}
      />
    </>
  );
};

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, top: 0, right: 0 },
  bottom: { position: "absolute", left: 0, right: 0 },
  left: { position: "absolute", left: 0 },
  right: { position: "absolute" },
});
