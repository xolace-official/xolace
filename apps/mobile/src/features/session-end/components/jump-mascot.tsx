// The acknowledge beat's mascot: a 4s transparent WebP loop that starts and ends on the
// still's pose, so it fits both screens' auto-advance (3.5s exit, 4.5s activity).
// Reduced motion keeps the still.

import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const LOOP = require("@/assets/images/flux/jump-love.webp");
const STILL = require("@/assets/images/flux/jump-love-bgremove.png");

const styles = StyleSheet.create({
	mascot: {
		flex: 1,
		width: "100%",
	},
});

export const JumpMascot = () => {
	const reduceMotion = useEffectiveReducedMotion();

	return (
		<Image
			accessibilityIgnoresInvertColors
			autoplay={!reduceMotion}
			contentFit="contain"
			placeholder={STILL}
			placeholderContentFit="contain"
			source={reduceMotion ? STILL : LOOP}
			style={styles.mascot}
		/>
	);
};
