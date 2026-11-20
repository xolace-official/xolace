import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BackButton } from "@/components/shared/back-button";
import { COPY } from "@/features/achievements/copy";

export const BAR = 50;
const TITLE_TOP = 4;
const BACK_TOP = 2;
const BACKDROP = { from: 8, over: 32 } as const;
const TITLE = { from: 30, over: 20 } as const;

const fade = (y: number, { from, over }: { from: number; over: number }) => {
	"worklet";
	return Math.min(1, Math.max(0, (y - from) / over));
};

export function BadgesBar({
	y,
	hidden,
}: {
	y: SharedValue<number>;
	hidden: boolean;
}) {
	const { top } = useSafeAreaInsets();
	const backdrop = useAnimatedStyle(() => ({
		opacity: fade(y.get(), BACKDROP),
	}));
	const title = useAnimatedStyle(() => ({ opacity: fade(y.get(), TITLE) }));
	return (
		<View
			accessibilityElementsHidden={hidden}
			className="absolute inset-x-0 top-0"
			importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
			pointerEvents="box-none"
			style={{ height: top + BAR }}
		>
			<Animated.View
				className="absolute inset-0 bg-linear-to-b from-background via-62% via-background to-background/0"
				pointerEvents="none"
				style={backdrop}
			/>
			<Animated.View
				accessibilityElementsHidden
				className="absolute inset-x-20 h-10 justify-center"
				importantForAccessibility="no-hide-descendants"
				pointerEvents="none"
				style={[{ top: top + TITLE_TOP }, title]}
			>
				<AppText
					center
					className="text-[17px] leading-[22px]"
					variant="body"
					weight="semibold"
				>
					{COPY.list.title}
				</AppText>
			</Animated.View>
			<BackButton className="absolute left-4" style={{ top: top + BACK_TOP }} />
		</View>
	);
}
