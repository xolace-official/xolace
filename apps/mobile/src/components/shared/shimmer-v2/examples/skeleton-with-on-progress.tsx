import React, { FC } from "react";
import { View } from "react-native";
import Shimmer from "../index";
import Animated, {
  useAnimatedStyle,
  interpolateColor,
  useSharedValue,
} from "react-native-reanimated";

export const SkeletonWithOnProgress: FC = () => {
  const shimmerProgress = useSharedValue(0);

  const animatedSkeletonBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      shimmerProgress.get(),
      [0, 0.5, 1],
      ["#312e81", "#7c3aed", "#312e81"],
    );
    return { flex: 1, backgroundColor };
  });

  return (
    <Shimmer className="w-4/5 rounded-3xl" style={{ borderCurve: "continuous" }}>
      <Shimmer.Mask
        background={<Animated.View style={animatedSkeletonBackgroundStyle} />}
        overlay={
          <Shimmer.Overlay
            width={20}
            onProgress={shimmerProgress}
            animation={{
              reverse: true,
              type: "timing",
              config: { duration: 1500 },
            }}
          >
            <View className="flex-1 flex-row gap-1">
              <View className="w-px bg-white/5" />
              <View className="w-px bg-white/25" />
              <View className="w-px bg-white/50" />
              <View className="w-px bg-white/25" />
              <View className="w-px bg-white/5" />
            </View>
          </Shimmer.Overlay>
        }
      >
        <View className="p-5 gap-5">
          <View className="flex-row items-center gap-3">
            <View className="size-12 rounded-full bg-black" />
            <View className="flex-1 gap-2">
              <View className="h-3.5 w-2/3 rounded-full bg-black" />
              <View className="h-2.5 w-2/5 rounded-full bg-black" />
            </View>
          </View>

          <View className="gap-2.5">
            <View className="h-3 w-full rounded-full bg-black" />
            <View className="h-3 w-[90%] rounded-full bg-black" />
            <View className="h-3 w-3/4 rounded-full bg-black" />
          </View>

          <View className="h-36 w-full rounded-2xl bg-black" />

          <View className="flex-row gap-3">
            <View className="h-10 flex-1 rounded-full bg-black" />
            <View className="h-10 flex-1 rounded-full bg-black" />
          </View>
        </View>
      </Shimmer.Mask>
    </Shimmer>
  );
};
