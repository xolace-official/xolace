import { Image } from "expo-image";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { HELD_R, type Pose, type Pt } from "@/features/achievements/coin/pose";

/**
 * The colour and the bloom (badges §3, §6): one scaled disc and one glow image,
 * white and tinted with the family's colour. A Skia canvas inside the moving
 * page didn't draw on device, so these are images, made once by the prototype's
 * `scripts/make-badge-glows.py`. Nothing full-screen is redrawn per frame.
 */
const FLOOD_BOX = 256;
const FLOOD_R = FLOOD_BOX / 2;
const DISC = require("@/assets/images/badges/flood-disc.png");
const GLOW_DUSK = require("@/assets/images/badges/bloom-dusk.png");
const GLOW_DAY = require("@/assets/images/badges/bloom-day.png");
const BLOOM = 520;
const BLOOM_R = BLOOM / 2;

/** The page colour pouring out of `o`, out to `reach` (the farthest corner and a margin). */
export function Flood({
	pose,
	o,
	reach,
	color,
}: {
	pose: SharedValue<Pose>;
	o: Pt;
	reach: SharedValue<number>;
	color: string;
}) {
	const style = useAnimatedStyle(() => {
		const p = pose.get();
		return {
			opacity: p.spread > 0 ? p.power * p.alpha : 0,
			transform: [{ scale: (Math.max(0, p.spread) * reach.get()) / FLOOD_R }],
		};
	});
	return (
		<Animated.View
			className="absolute"
			pointerEvents="none"
			style={[
				{
					height: FLOOD_BOX,
					left: o.x - FLOOD_R,
					top: o.y - FLOOD_R,
					width: FLOOD_BOX,
				},
				style,
			]}
		>
			<Image
				source={DISC}
				style={{ height: FLOOD_BOX, width: FLOOD_BOX }}
				tintColor={color}
			/>
		</Animated.View>
	);
}

/** The family's light behind the badge, from landing; it follows the coin's size. */
export function Bloom({
	pose,
	glow,
	dark,
}: {
	pose: SharedValue<Pose>;
	glow: string;
	dark: boolean;
}) {
	const style = useAnimatedStyle(() => {
		const p = pose.get();
		return {
			opacity: p.bloom * p.alpha,
			transform: [
				{ translateX: p.cx - BLOOM_R },
				{ translateY: p.cy - BLOOM_R },
				{ scale: p.r / HELD_R },
			],
		};
	});
	return (
		<Animated.View
			className="absolute top-0 left-0"
			pointerEvents="none"
			style={[{ height: BLOOM, width: BLOOM }, style]}
		>
			<Image
				source={dark ? GLOW_DUSK : GLOW_DAY}
				style={{ height: BLOOM, width: BLOOM }}
				tintColor={glow}
			/>
		</Animated.View>
	);
}
