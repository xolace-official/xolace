import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { usePlayer } from "../player-data";
import { fromCover, P, WAVE } from "../player-metrics";
import { ScrubA11y } from "./scrub-a11y";
import { ScrubPill } from "./scrub-pill";
import type { Playhead } from "./use-playhead";
import { useScrub } from "./use-scrub";

const REST_H = 4;
const TOUCHED_H = 10;

export function ScrubLine({
	duration,
	head,
	reduced,
	disabled = false,
}: {
	duration: number;
	head: Playhead;
	reduced: boolean;
	disabled?: boolean;
}) {
	const { actions } = usePlayer();
	const boxW = useSharedValue(0);
	const pan = useScrub({
		bars: 0,
		boxW,
		duration,
		enabled: !disabled,
		head,
		onRelease: actions.seek,
		reduced,
	});
	const track = useAnimatedStyle(() => {
		const h = REST_H + (TOUCHED_H - REST_H) * head.grow.get();
		return { borderRadius: h / 2, height: h };
	});
	const fill = useAnimatedStyle(() => ({
		width: `${head.shown.get() * 100}%`,
	}));
	return (
		<ScrubA11y
			style={{
				height: P.lineH,
				left: P.side,
				right: P.side,
				top: fromCover(P.lineTop),
			}}
		>
			<GestureDetector gesture={pan}>
				<View
					className="flex-1 justify-center"
					onLayout={(e) => boxW.set(e.nativeEvent.layout.width)}
				>
					<Animated.View
						className="w-full overflow-hidden bg-player-ink/25"
						style={track}
					>
						<Animated.View className="h-full bg-player-ink" style={fill} />
					</Animated.View>
					<ScrubPill
						above={WAVE.pillAboveLine}
						boxW={boxW}
						duration={duration}
						head={head}
					/>
				</View>
			</GestureDetector>
		</ScrubA11y>
	);
}
