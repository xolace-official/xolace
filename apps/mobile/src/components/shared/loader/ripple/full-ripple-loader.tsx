import React from "react";
import { View } from "react-native";
import { RippleLoader } from "./ripple-loader";

/** Full-screen centered ripple loader. */
export const FullRippleLoader = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <RippleLoader />
  </View>
);
