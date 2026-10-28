import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { MoodItem } from "@/features/onboarding/components/mood-card";

type Props = {
	mood: MoodItem;
};

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);
const START_TOP_LEFT = { x: 0, y: 0 };
const END_BOTTOM_RIGHT = { x: 1, y: 1 };

const MoodBgComponent = ({ mood }: Props) => {
	const colors: readonly [string, string, string] = [
		mood.colors[0] + "40",
		mood.colors[1] + "30",
		mood.colors[2] + "20",
	];

	return (
		<View style={StyleSheet.absoluteFill}>
			<AnimatedGradient
				colors={colors}
				end={END_BOTTOM_RIGHT}
				entering={FadeIn.duration(600)}
				exiting={FadeOut.duration(600)}
				key={mood.id}
				start={START_TOP_LEFT}
				style={StyleSheet.absoluteFill}
			/>
			<View className="bg-background/65" style={StyleSheet.absoluteFill} />
		</View>
	);
};

export const MoodBg = MoodBgComponent;
