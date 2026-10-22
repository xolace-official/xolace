import React from "react";
import { View } from "react-native";
import { SquishLoader } from "./squish-loader";

/** Full-screen centered squish loader. */
export const FullSquishLoader = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <SquishLoader />
  </View>
);
