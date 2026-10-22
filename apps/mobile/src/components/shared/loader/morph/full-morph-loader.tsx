import React from "react";
import { View } from "react-native";
import { MorphLoader } from "./morph-loader";

/** Full-screen centered morph loader. */
export const FullMorphLoader = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <MorphLoader />
  </View>
);
