import React, { FC } from "react";
import { View, Text, Pressable } from "react-native";
import Shimmer from "../index";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

type Props = {
  debug?: boolean;
};

export const PlayButton: FC<Props> = ({ debug = false }) => {
  const shimmerProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${shimmerProgress.get() * 360}deg` }],
    };
  });

  return (
    <Pressable>
      <View style={{ padding: 3, backgroundColor: "#4f46e5" }}>
        <View style={{ padding: 2, backgroundColor: "#1e1b4b" }}>
          <Shimmer debug={debug} className="px-14 py-5" style={{ backgroundColor: "#0a0a1f" }}>
            <Shimmer.Overlay
              width={60}
              trackAngle={0}
              initialDelay={0}
              animation={{
                reverse: true,
                type: "timing",
                config: { duration: 2800 },
              }}
              onProgress={shimmerProgress}
            >
              <Animated.View
                style={animatedStyle}
                className="h-full w-full items-center justify-around py-1"
              >
                <View className="size-2 bg-cyan-400" />
                <View className="size-1.5 bg-cyan-400/40" />
                <View className="size-2 bg-cyan-300/70" />
              </Animated.View>
            </Shimmer.Overlay>

            <Shimmer.Overlay width={24} trackAngle={25} initialDelay={400} duration={3200}>
              <View className="flex-1 items-center justify-around py-2">
                <View className="size-1.5 bg-fuchsia-500/60" />
                <View className="size-2.5 bg-fuchsia-400" />
                <View className="size-1.5 bg-fuchsia-400/30" />
              </View>
            </Shimmer.Overlay>

            <Shimmer.Overlay width={20} trackAngle={340} initialDelay={800} duration={2400}>
              <View className="flex-1 items-center justify-around py-1">
                <View className="size-1.5 bg-lime-400/50" />
                <View className="size-2 bg-lime-300" />
                <View className="size-1.5 bg-lime-400/70" />
              </View>
            </Shimmer.Overlay>

            <Shimmer.Overlay width={22} trackAngle={65} initialDelay={200} duration={3600}>
              <View className="flex-1 items-center justify-around">
                <View className="size-2 bg-amber-400/40" />
                <View className="size-1.5 bg-amber-300/80" />
                <View className="size-2 bg-amber-400/60" />
              </View>
            </Shimmer.Overlay>

            <Text className="text-white text-2xl font-bold tracking-widest text-center">PLAY</Text>
          </Shimmer>
        </View>
      </View>
    </Pressable>
  );
};
