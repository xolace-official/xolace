import type { TalkView } from "@xolace/backend/convex/lib/voices";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Segmented } from "@/components/shared/segmented";
import { TALK_COPY } from "../copy";
import { GO, LAYOUT, OUT_EASE, seg } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";

const DROP = 6;
const FADE_MS = 300;

export function TalkSwitch({
	top,
	motion,
	view,
	onChange,
}: {
	top: number;
	motion: TalkMotion;
	view: TalkView;
	onChange: (view: TalkView) => void;
}) {
	const style = useAnimatedStyle(() => {
		const g = motion.go.get();
		if (motion.reduced.get()) {
			return { opacity: seg(g, GO.reduced / 2, GO.reduced / 2) };
		}
		return {
			opacity: seg(g, GO.switchAt, FADE_MS),
			transform: [
				{
					translateY: -DROP * (1 - seg(g, GO.switchAt, GO.pillMove, OUT_EASE)),
				},
			],
		};
	});
	return (
		<Animated.View
			className="absolute self-center"
			style={[{ top, width: LAYOUT.switchW }, style]}
		>
			<Segmented
				onChange={onChange}
				options={TALK_COPY.live.views}
				value={view}
			/>
		</Animated.View>
	);
}
