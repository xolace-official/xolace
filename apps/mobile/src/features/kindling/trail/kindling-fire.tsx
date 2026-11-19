import { Image } from "expo-image";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { CAMPFIRE_LOOP, CAMPFIRE_STILL } from "../poses";
import type { FireBox } from "./trail-points";

/** Flux lifts from the flame: 49% across, 86% down its box. */
const FLAME_ORIGIN = "49% 86%";

/**
 * Flux at the campfire where the road ends (§5): production's campfire loop, a 4 s transparent
 * WebP that starts and ends on the still's pose; the still with Reduce Motion. It lifts as the
 * fire catches, from the flame. Its glow is the road's canvas; its embers are the sparks'.
 */
export function KindlingFire({
	fire,
	lift,
	reduced,
}: {
	fire: FireBox;
	lift: SharedValue<number>;
	reduced: boolean;
}) {
	const style = useAnimatedStyle(() => ({
		transform: [{ scale: lift.get() }],
	}));
	return (
		<Animated.View
			accessible={false}
			className="absolute"
			pointerEvents="none"
			style={[
				{
					height: fire.h,
					left: fire.x,
					top: fire.y,
					transformOrigin: FLAME_ORIGIN,
					width: fire.w,
				},
				style,
			]}
		>
			<Image
				accessible={false}
				autoplay={!reduced}
				contentFit="contain"
				placeholder={CAMPFIRE_STILL}
				placeholderContentFit="contain"
				source={reduced ? CAMPFIRE_STILL : CAMPFIRE_LOOP}
				style={{ height: fire.h, width: fire.w }}
			/>
		</Animated.View>
	);
}
