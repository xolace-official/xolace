import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { TALK_COPY } from "../copy";

const BAR_SHAPE = [0.5, 0.85, 1, 0.75, 0.45] as const;
const REST = 0.25;

function LevelBar({
	level,
	shape,
}: {
	level: SharedValue<number>;
	shape: number;
}) {
	const style = useAnimatedStyle(() => ({
		transform: [{ scaleY: REST + (1 - REST) * shape * level.get() }],
	}));
	return (
		<Animated.View
			className="h-4 w-[3px] rounded-[2px] bg-accent-foreground"
			style={style}
		/>
	);
}

export function LevelBars({
	level,
	muted,
}: {
	level: SharedValue<number>;
	muted: boolean;
}) {
	return (
		<View
			accessibilityLabel={
				muted ? TALK_COPY.live.micOff : TALK_COPY.live.listening
			}
			accessible
			className={cn(
				"size-9 flex-row items-center justify-center gap-0.5 rounded-full bg-accent",
				muted ? "opacity-40" : "opacity-100"
			)}
		>
			{BAR_SHAPE.map((shape, i) => (
				<LevelBar key={`${shape}-${i}`} level={level} shape={shape} />
			))}
		</View>
	);
}
