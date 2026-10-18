import { useEffect } from "react";
import { View } from "react-native";
import { useThemeColor } from "heroui-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { Doc } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { ThinkingOrb } from "@/src/components/ui/thinking-orb";
import Shimmer from "@/src/components/shared/shimmer";
import { SparkleStars } from "@/src/components/shared/sparkle-stars";
import { useProcessingBreathHaptic } from "@/src/lib/haptics";

// Chosen by what the pipeline is actually doing, never cycled (rule 12):
// a line only claims memory when one connected (convex/ai/process.ts).
const LINES = {
  reading: "Taking this in...",
  writing: "Finding the words...",
  connecting: "Holding this next to what you've shared before...",
} as const;

const FADE_IN = FadeIn.duration(400);

const SHIMMER_CONTAINER_STYLE = {
  overflow: "hidden",
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 6,
} as const;

const SHIMMER_OVERLAY_INNER_STYLE = {
  flex: 1,
  opacity: 0.15,
} as const;

type Props = {
  stage: Doc<"sessions">["processingStage"];
};

export const ProcessingState = ({ stage }: Props) => {
  const accentColor = useThemeColor("accent");
  const playBreath = useProcessingBreathHaptic();
  const line = LINES[stage ?? "reading"];

  useEffect(() => {
    playBreath();
    // Mount-once: the breath marks arrival at the processing state, not each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmerOverlayStyle = {
    ...SHIMMER_OVERLAY_INNER_STYLE,
    backgroundColor: accentColor,
  };

  return (
    <View className="flex-1 items-center justify-center gap-8">
      <ThinkingOrb state="composing" size={210} color={accentColor} />
      <View className="items-center">
        <Shimmer style={SHIMMER_CONTAINER_STYLE}>
          <Shimmer.Overlay
            width="40%"
            duration={2000}
            repeatDelay={800}
            trackAngle={0}
          >
            <View style={shimmerOverlayStyle} />
          </Shimmer.Overlay>
          {/* Keyed by line: each stage change fades the new line in. */}
          {/* TODO: Nothing has been checked on a device yet — verify the fade between stage lines. */}
          <Animated.View
            key={line}
            entering={FADE_IN}
            accessibilityLiveRegion="polite"
          >
            <AppText className="text-sm text-foreground/40">{line}</AppText>
          </Animated.View>
        </Shimmer>
        <SparkleStars color={accentColor} />
      </View>
    </View>
  );
};
