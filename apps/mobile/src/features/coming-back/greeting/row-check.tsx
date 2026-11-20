import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedProps,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { cn } from "@/lib/cn";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SIZE = 20;
const STROKE = 2.6;
const CHECK = { d: "M5 12.5l4.3 4.3L19 7", len: 20 } as const;

export function RowCheck({
	color,
	draw,
	shown,
}: {
	color: string | undefined;
	draw: SharedValue<number>;
	shown: boolean;
}) {
	const props = useAnimatedProps(() => ({
		strokeDashoffset: CHECK.len * (1 - draw.get()),
	}));
	return (
		<View className={cn("absolute", shown ? "opacity-100" : "opacity-0")}>
			<Svg fill="none" height={SIZE} viewBox="0 0 24 24" width={SIZE}>
				<AnimatedPath
					animatedProps={props}
					d={CHECK.d}
					stroke={color}
					strokeDasharray={CHECK.len}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={STROKE}
				/>
			</Svg>
		</View>
	);
}
