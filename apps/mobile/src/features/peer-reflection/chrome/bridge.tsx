import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import type { PeersColors } from "../peers-colors";
import { EASE } from "../peers-ease";
import { LAYOUT, T } from "../peers-look";

const B = LAYOUT.bridge;
const FADE_MS = 600;

type Props = {
	text: string;
	none: boolean;
	colors: PeersColors;
	arrive: SharedValue<number>;
	reduced: boolean;
};

export function Bridge({ text, none, colors, arrive, reduced }: Props) {
	const [c0, c1, c2] = colors.ember;
	const style = useAnimatedStyle(() => {
		const e = arrive.get() - T.first;
		let opacity = 0;
		if (e > 0) {
			opacity = reduced
				? clamp01(e / REDUCED_FADE_MS)
				: EASE.css(clamp01(e / FADE_MS));
		}
		return { opacity };
	});
	return (
		<Animated.View
			className="items-center"
			style={[
				{
					gap: B.gap,
					marginHorizontal: B.side,
					marginTop: none ? B.noneTop : B.top - LAYOUT.cards.gap,
				},
				style,
			]}
		>
			<View
				style={{
					borderRadius: B.dot / 2,
					boxShadow: `0 0 10px 2px ${colors.dotGlow}`,
					experimental_backgroundImage: `radial-gradient(circle at 38% 34%, ${c0}, ${c1} 48%, ${c2})`,
					height: B.dot,
					width: B.dot,
				}}
			/>
			<AppText
				center
				color="muted"
				style={{ fontSize: B.size, lineHeight: B.line }}
				variant="footnote"
			>
				{text}
			</AppText>
		</Animated.View>
	);
}
