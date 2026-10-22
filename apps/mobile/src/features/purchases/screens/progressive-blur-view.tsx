import { View, StyleSheet, Platform } from "react-native";
import { BlurView, BlurViewProps } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useThemeColor } from "heroui-native";
import { cn } from "@/src/lib/utils";

type Props = {
  position?: "top" | "bottom";
  height?: number;
  blurViewProps?: BlurViewProps;
};

/**
 * ProgressiveBlurView — top/bottom fade-to-blur edge, e.g. under a status bar
 * or behind a sticky CTA. The iOS mask gradient (black/transparent) is a
 * luminance mask, not visible UI color, so it stays hardcoded.
 *
 * Android has no working backdrop blur for this: expo-blur's default method is a
 * flat translucent overlay, and `experimentalBlurMethod="dimezisBlurView"` still
 * leaves the content behind it perfectly sharp (verified on API 35). So Android
 * gets an opaque scrim instead — it reaches full background opacity across the
 * band that sits behind content (the sticky CTA / legal links) and only fades out
 * at the edge facing the scroll. A weak fade here is what let the feature rows
 * show through the legal copy.
 */
export function ProgressiveBlurView({ position = "top", height = 100, blurViewProps }: Props) {
  const backgroundColor = useThemeColor("background") as string;
  const isTop = position === "top";

  // MaskedView takes the mask as an element; React Compiler memoizes it.
  const mask = (
    // eslint-disable-next-line react-perf/jsx-no-jsx-as-prop
    <LinearGradient
      locations={isTop ? [0.5, 0.75, 1] : [0, 0.25, 0.5]}
      colors={
        isTop
          ? ["black", "#00000080", "transparent"]
          : ["transparent", "#00000080", "black"]
      }
      style={StyleSheet.absoluteFill}
    />
  );

  return (
    <View
      className={cn(
        "absolute left-0 right-0 pointer-events-none",
        isTop ? "top-0" : "bottom-0",
      )}
      style={{ height }}
    >
      {Platform.OS === "android" ? (
        <LinearGradient
          style={StyleSheet.absoluteFill}
          locations={isTop ? [0, 0.55, 1] : [0, 0.45, 1]}
          colors={
            isTop
              ? [backgroundColor, backgroundColor, `${backgroundColor}00`]
              : [`${backgroundColor}00`, backgroundColor, backgroundColor]
          }
        />
      ) : (
        <MaskedView maskElement={mask} style={StyleSheet.absoluteFill}>
          <BlurView
            style={[StyleSheet.absoluteFill, blurViewProps?.style]}
            intensity={blurViewProps?.intensity ?? 70}
            {...blurViewProps}
          />
        </MaskedView>
      )}
    </View>
  );
}
