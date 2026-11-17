import { View } from "react-native";
import Animated, {
	type DerivedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { BandBlur } from "./band-blur";
import { TalkThread } from "./talk-thread";

/**
 * Under the header the thread melts into the page: solid behind the switch, then this long
 * a fade below it. The first message sits under the fade, so it's fully clear at the top.
 */
const HEADER_FADE = 24;
/** The thread's last line keeps this much air above the composer. */
const ABOVE_COMPOSER = 10;

/** The Conversation view and the fade under the header, cross-fading with the stage. */
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
	/** Conversation is the view: it takes touches. */
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
			{/* Under the header, pill and switch; it shares the thread's fade, so Companion has none. */}
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
