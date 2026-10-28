import { useThemeColor } from "heroui-native";
import React from "react";
import { StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";
import Loader from "../index";
import type { LoaderKeyframes } from "../types";

/** Square morphing to a circle and back across a full rotation, colour-shifting between accent
 * and foreground. */
const styles = StyleSheet.create({
	block: { height: 44, width: 44 },
	container: { alignItems: "center", justifyContent: "center" },
});

export const MorphLoader = () => {
	const accentColor = useThemeColor("accent");
	const foregroundColor = useThemeColor("foreground");

	const keyframes: LoaderKeyframes = {
		0: {
			backgroundColor: accentColor,
			borderRadius: 5,
			transform: [{ rotate: 0 }, { scale: 1 }],
		},
		50: {
			backgroundColor: foregroundColor,
			borderRadius: 26,
			transform: [{ rotate: 180 }, { scale: 0.8 }],
		},
		100: {
			backgroundColor: accentColor,
			borderRadius: 5,
			transform: [{ rotate: 360 }, { scale: 1 }],
		},
	};

	return (
		<Loader
			duration={2200}
			easing={Easing.inOut(Easing.ease)}
			style={styles.container}
		>
			<Loader.KeyframeView keyframes={keyframes} style={styles.block} />
		</Loader>
	);
};
