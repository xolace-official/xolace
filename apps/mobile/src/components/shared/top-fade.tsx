import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { useTokenColor } from "@/lib/use-token-color";

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
