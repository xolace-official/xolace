import { Platform, View } from "react-native";
import Animated, {
	Easing,
	FadeInDown,
	FadeOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayerContent } from "@/features/browse/now-playing/mini-player-accessory";

const GAP = 8;
const ENTER = FadeInDown.duration(240).easing(Easing.bezier(0.23, 1, 0.32, 1));
const EXIT = FadeOutDown.duration(160).easing(Easing.out(Easing.quad));

// The native tab bar's top edge from the screen bottom. iPad below iOS 26 puts
// the bar at the top. Hard-coded heights: NativeTabs exposes none.
function useTabBarTop() {
	const { bottom } = useSafeAreaInsets();
	if (Platform.OS === "ios" && Platform.isPad) {
		return bottom;
	}
	return (process.env.EXPO_OS === "android" ? 80 : 49) + bottom;
}

/** Mini-player where the tab bar has no accessory slot (iOS < 26, Android). Sibling of
 * NativeTabs, so any pushed screen covers it. */
export function MiniPlayerOverlay() {
	const bottom = useTabBarTop() + GAP;
	return (
		<Animated.View
			className="absolute right-3 left-3"
			entering={ENTER}
			exiting={EXIT}
			pointerEvents="box-none"
			style={{ bottom }}
		>
			<View className="h-12 flex-row rounded-full border border-border/50 bg-surface shadow-lg">
				<MiniPlayerContent inline={false} />
			</View>
		</Animated.View>
	);
}
