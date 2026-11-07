// One voice in the carousel: its orb, named, shrinking and dimming as it leaves the centre,
// with a ring behind it that swells while its sample plays.

import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { Pressable, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useOrbTones, VoiceOrb } from "./voice-orb";

const ORB = 0.84; // of the slot
const SIDE_SCALE = 0.68;
const SIDE_OPACITY = 0.45;
const RING_OPACITY = 0.25;
const RING_SWELL = 0.18;
const SLOT_PAD = 18;

type SlotProps = {
	slug: VoiceSlug;
	label: string;
	index: number;
	/** Its width; the carousel snaps one slot at a time. */
	slot: number;
	/** The carousel's scroll offset. */
	x: SharedValue<number>;
	level?: SharedValue<number>;
	running: boolean;
	selected: boolean;
	onPress: () => void;
};

export function VoiceSlot({
	slug,
	label,
	index,
	slot,
	x,
	level,
	running,
	selected,
	onPress,
}: SlotProps) {
	const size = slot * ORB;
	const [, mid] = useOrbTones(slug);
	const style = useAnimatedStyle(() => {
		const d = Math.abs(x.get() / slot - index);
		return {
			opacity: interpolate(d, [0, 1], [1, SIDE_OPACITY], Extrapolation.CLAMP),
			transform: [
				{
					scale: interpolate(d, [0, 1], [1, SIDE_SCALE], Extrapolation.CLAMP),
				},
			],
		};
	});
	const silent = useSharedValue(0);
	const ring = useAnimatedStyle(() => {
		const l = (level ?? silent).get();
		return {
			opacity: RING_OPACITY * l,
			transform: [{ scale: 1 + RING_SWELL * l }],
		};
	});
	return (
		<Pressable
			accessibilityHint={
				selected ? "Plays or stops its sample" : "Picks this voice"
			}
			accessibilityLabel={`${label} voice`}
			accessibilityRole="button"
			accessibilityState={{ selected }}
			onPress={onPress}
			style={{ alignItems: "center", paddingVertical: SLOT_PAD, width: slot }}
		>
			<Animated.View style={style}>
				<Animated.View
					className="absolute rounded-full"
					style={[{ backgroundColor: mid, height: size, width: size }, ring]}
				/>
				<VoiceOrb level={level} running={running} size={size} voice={slug} />
				<View className="absolute inset-0 items-center justify-center">
					<AppText className="font-medium text-[20px] text-white">
						{label}
					</AppText>
				</View>
			</Animated.View>
		</Pressable>
	);
}
