import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { useTokenColor } from "@/lib/use-token-color";
import { clearOf } from "../clear-of";

/**
 * Peers' `.topf`: the page fading over scrolled content under the header face,
 * solid to `solid`, clear by `height`. Shown only once the column has scrolled.
 */
export function TopFade({
	solid,
	height,
	shown,
}: {
	solid: number;
	height: number;
	shown: SharedValue<number>;
}) {
	const page = useTokenColor("background");
	const style = useAnimatedStyle(() => ({ opacity: shown.get() }));
	return (
		<Animated.View
			className="absolute inset-x-0 top-0 z-15"
			pointerEvents="none"
			style={[{ height }, style]}
		>
			<LinearGradient
				className="flex-1"
				colors={[page, page, clearOf(page)]}
				locations={[0, solid / height, 1]}
			/>
		</Animated.View>
	);
}
