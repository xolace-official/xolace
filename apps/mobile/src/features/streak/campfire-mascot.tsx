// The streak-held mascot: a 4s transparent WebP loop that starts and ends on the still's
// pose, so it loops for as long as the screen is up. Reduced motion keeps the still.

import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const LOOP = require("@/assets/images/flux/flux-campfire-loop.webp");
const STILL = require("@/assets/images/flux/flux-campfire-still.webp");

const styles = StyleSheet.create({
	// 3:4 like the loop; Flux fills ~92% of its height, so 272 keeps it at the old 260 square's size.
	mascot: { aspectRatio: 3 / 4, height: 272 },
});

export const CampfireMascot = () => {
	const reduceMotion = useEffectiveReducedMotion();

	return (
		<Image
			accessibilityIgnoresInvertColors
			accessible={false}
			autoplay={!reduceMotion}
			contentFit="contain"
			placeholder={STILL}
			placeholderContentFit="contain"
			source={reduceMotion ? STILL : LOOP}
			style={styles.mascot}
		/>
	);
};
