// TopFade: the page colour fading over scrolled content, no blur, under chrome a screen draws
// itself. Use TopBlur (top-blur.tsx) under a transparent native header, BandBlur (band-blur.tsx)
// when self-drawn chrome needs the content blurred too.

import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { useTokenColor } from "@/lib/use-token-color";

/**
 * Peers' `.topf` (You're not alone, After a session): the page fading over scrolled content under the header face,
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
