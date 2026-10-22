import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle } from "react-native-svg";

import { TWIG_PRESENTATION } from "@/src/features/kindling/twig-presentation";
import {
  CLEAN_POSES, POSE, RING_ACCENT, RING_ARC, type AnnouncementKind,
} from "@/src/features/kindling/announcement-poses";

/**
 * One Flux pose in a tinted circle with a decorative partial ring.
 * Purely illustrative: an image to screen readers, never a tap target.
 */
export function PoseBubble({ kind, size }: { kind: AnnouncementKind; size: number }) {
  const stroke = Math.max(3, size * 0.05);
  const inset = stroke * 1.8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const accent = RING_ACCENT[kind];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={TWIG_PRESENTATION[kind].title}
      style={{ width: size, height: size }}
    >
      <View
        className="absolute overflow-hidden rounded-full"
        style={{ backgroundColor: `${accent}33`, top: inset, left: inset, right: inset, bottom: inset }}
      >
        <Image
          source={POSE[kind]}
          contentFit={CLEAN_POSES.has(kind) ? "contain" : "cover"}
          transition={200}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Svg width={size} height={size} style={styles.ring}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={accent} strokeOpacity={0.2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * RING_ARC[kind]} ${circumference}`}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // The ring starts at 12 o'clock.
  ring: { position: "absolute", transform: [{ rotate: "-90deg" }] },
});
