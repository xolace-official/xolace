import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { LETTERS, UNDO_SECONDS } from "../copy";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";

const L = LETTER_MOTION.label;
const UNDO_MS = UNDO_SECONDS * 1000;
const HIT = 10;

export function UndoPill({
	label,
	reduced,
	onUndo,
}: {
	label: string;
	reduced: boolean;
	onUndo: () => void;
}) {
	const left = useSharedValue(1);
	useEffect(() => {
		if (!reduced) {
			left.set(
				withTiming(0, {
					duration: UNDO_MS,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	}, [reduced, left]);
	const drain = useAnimatedStyle(() => ({
		transform: [{ scaleX: left.get() }],
	}));
	return (
		<View className="px-4 pt-3 pb-safe-offset-4">
			<Fade
				appear
				className="min-h-[52px] flex-row items-center justify-between overflow-hidden rounded-full bg-foreground py-2 pr-6 pl-5"
				ms={L.ms}
				on
				reduced={reduced}
				rise={L.rise}
			>
				<AppText
					accessibilityLiveRegion="polite"
					className="shrink"
					color="background"
					variant="callout"
				>
					{label}
				</AppText>
				<PressScale
					accessibilityLabel={LETTERS.read.undo}
					accessibilityRole="button"
					className="min-h-11 justify-center pl-4"
					hitSlop={HIT}
					onPress={onUndo}
				>
					<AppText className="text-ember" variant="callout" weight="bold">
						{LETTERS.read.undo}
					</AppText>
				</PressScale>
				<Animated.View
					className="absolute right-5 bottom-[7px] left-5 h-[1.5px] bg-ember"
					pointerEvents="none"
					style={[{ transformOrigin: "left" }, drain]}
				/>
			</Fade>
		</View>
	);
}
