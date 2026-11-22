import { View } from "react-native";
import Animated, {
	type DerivedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { BandBlur } from "@/components/shared/band-blur";
import { useTokenColor } from "@/lib/use-token-color";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { TalkThread } from "./talk-thread";

const HEADER_FADE = 24;
const ABOVE_COMPOSER = 10;

export function ThreadLayer({
	geo,
	motion,
	lift,
	offset,
	open,
	focused,
	reduced,
}: {
	geo: TalkGeometry;
	motion: TalkMotion;
	lift: DerivedValue<number>;
	offset: number;
	open: boolean;
	focused: boolean;
	reduced: boolean;
}) {
	const page = useTokenColor("background");
	const style = useAnimatedStyle(() => ({
		opacity: motion.conversation.get(),
	}));
	const solid = geo.switchTop + LAYOUT.switchH;
	return (
		<Animated.View
			accessibilityElementsHidden={!open}
			className="absolute inset-0"
			importantForAccessibility={open ? "auto" : "no-hide-descendants"}
			pointerEvents={open ? "auto" : "none"}
			style={style}
		>
			<TalkThread
				bottom={geo.height - geo.composerTop + ABOVE_COMPOSER}
				focused={focused}
				inset={lift}
				offset={offset}
				reduced={reduced}
				top={solid + HEADER_FADE}
			/>
			<View
				className="absolute inset-x-0 top-0"
				pointerEvents="none"
				style={{ height: solid + HEADER_FADE }}
			>
				<BandBlur height={solid + HEADER_FADE} page={page} solid={solid} />
			</View>
		</Animated.View>
	);
}
