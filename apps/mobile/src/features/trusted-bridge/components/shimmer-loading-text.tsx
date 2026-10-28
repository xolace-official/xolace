import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import Shimmer from "@/components/shared/shimmer-v2";

type Props = {
	name: string;
};

const BOB_EASING = Easing.inOut(Easing.ease);

const styles = StyleSheet.create({
	mascot: { height: 132, width: 132 },
	shimmerGradient: {
		experimental_backgroundImage:
			"linear-gradient(to right, transparent 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.95) 60%, transparent 100%)",
	},
});

// Hoisted so they are not re-created per render (react-perf/jsx-no-jsx-as-prop).
const BACKGROUND = <View className="flex-1 bg-foreground/25" />;
const OVERLAY = (
	<Shimmer.Overlay
		animation={{
			config: { duration: 1900, easing: Easing.inOut(Easing.ease) },
			type: "timing",
		}}
		width="100%"
	>
		<View className="flex-1" style={styles.shimmerGradient} />
	</Shimmer.Overlay>
);

export function ShimmerLoadingText({ name }: Props) {
	const recipient = name.trim() || "them";

	// Gentle float while the draft loads.
	const bob = useSharedValue(0);
	useEffect(() => {
		bob.set(
			withRepeat(
				withTiming(1, { duration: 1800, easing: BOB_EASING }),
				-1,
				true
			)
		);
	}, [bob]);
	const mascotStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -6 * bob.get() }],
	}));

	return (
		<View className="items-center gap-3 px-8">
			<Animated.View className="mb-3" style={mascotStyle}>
				<Image
					contentFit="contain"
					source={require("@/assets/images/flux/loading-1.png")}
					style={styles.mascot}
				/>
			</Animated.View>

			<Shimmer>
				<Shimmer.Mask background={BACKGROUND} overlay={OVERLAY}>
					<AppText className="text-center font-light text-black text-xl leading-8">
						{`Finding the words for ${recipient}…`}
					</AppText>
				</Shimmer.Mask>
			</Shimmer>

			<AppText className="text-center font-light text-foreground/35 text-sm leading-5">
				Turning what you felt into something you can say.
			</AppText>
		</View>
	);
}
