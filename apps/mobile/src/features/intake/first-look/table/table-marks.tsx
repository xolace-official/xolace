// The table's marks: a check in a disc, and the band behind the Plus column that brightens as
// the first Plus check lands.
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { cn } from "@/lib/cn";
import { litAt } from "../first-look-model";
import { BAND_MS, unit } from "../first-look-motion";

export const FREE_COL = 46;
export const PLUS_COL = 52;
/** Right of an open row's preview and of the separators: the Plus column and its 6 pt. */
export const BODY_RIGHT = 58;
const BAND_DIM = 0.35;

/** `bg` is a background class; `color` is the tick's stroke. */
export function Check({ bg, color }: { bg: string; color: string }) {
	return (
		<View className={cn("size-6 items-center justify-center rounded-full", bg)}>
			<Svg
				fill="none"
				height={15}
				stroke={color}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2.8}
				viewBox="0 0 24 24"
				width={15}
			>
				<Path d="M6.5 12.5l3.6 3.6 7.4-8" />
			</Svg>
		</View>
	);
}

/** Inside the card's 1 pt border, so 6 from its outer edge. */
export function Band({ clock }: { clock: SharedValue<number> }) {
	const style = useAnimatedStyle(() => ({
		opacity:
			BAND_DIM + (1 - BAND_DIM) * unit((clock.get() - litAt(1)) / BAND_MS),
	}));
	return (
		<Animated.View
			className="absolute top-[5px] right-[5px] bottom-[5px] rounded-[18px] border border-ember/30 bg-ember-wash"
			pointerEvents="none"
			style={[{ borderCurve: "continuous", width: PLUS_COL }, style]}
		/>
	);
}
