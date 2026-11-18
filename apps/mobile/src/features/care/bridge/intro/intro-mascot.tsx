import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { EASE_OUT, PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { COPY } from "@/features/care/bridge/copy";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** Production's timing: Flux holds the boat a beat, then lets it sail. Once, never a loop. */
const HOLD_MS = 2200;
const RELEASE_MS = 2600;

const styles = StyleSheet.create({
	image: { height: "100%", width: "100%" },
	layer: StyleSheet.absoluteFill,
});

/** Flux holding a paper boat (intro-2) crossfading into the boat sailing off (intro-1). */
export function IntroMascot() {
	const reduced = useEffectiveReducedMotion();
	const released = useSharedValue(0);

	useEffect(() => {
		released.set(
			withDelay(
				HOLD_MS,
				withTiming(1, {
					duration: reduced ? REDUCED_FADE_MS : RELEASE_MS,
					easing: EASE_OUT,
					...PLAY_AS_CHOSEN,
				}),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [released, reduced]);

	const holding = useAnimatedStyle(() => ({ opacity: 1 - released.get() }));
	const sailing = useAnimatedStyle(() => ({ opacity: released.get() }));

	return (
		<View
			accessibilityLabel={COPY.intro.mascot}
			accessibilityRole="image"
			accessible
			className="h-60"
		>
			<Animated.View style={[styles.layer, holding]}>
				<Image
					contentFit="contain"
					source={require("@/assets/images/flux/intro-2.png")}
					style={styles.image}
				/>
			</Animated.View>
			<Animated.View style={[styles.layer, sailing]}>
				<Image
					contentFit="contain"
					source={require("@/assets/images/flux/intro-1.png")}
					style={styles.image}
				/>
			</Animated.View>
		</View>
	);
}
