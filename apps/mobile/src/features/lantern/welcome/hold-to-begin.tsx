import { useRef } from "react";
import { Pressable } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/lantern/copy";
import { LT } from "@/features/lantern/lantern-style";

const H = 56;
const FILL = { duration: LT.holdMs, easing: Easing.linear, ...PLAY_AS_CHOSEN };
const RELEASE = {
	duration: LT.holdReleaseMs,
	easing: Easing.out(Easing.ease),
	...PLAY_AS_CHOSEN,
};

export function HoldToBegin({ onDone }: { onDone: () => void }) {
	const fill = useSharedValue(0);
	const finished = useRef(false);
	const style = useAnimatedStyle(() => ({
		transform: [{ scaleX: fill.get() }],
	}));
	const done = () => {
		if (finished.current) {
			return;
		}
		finished.current = true;
		onDone();
	};
	return (
		<Pressable
			accessibilityActions={[{ name: "activate" }]}
			accessibilityLabel={COPY.welcome.hold}
			accessibilityRole="button"
			className="mt-5 items-center justify-center self-stretch overflow-hidden bg-foreground"
			onAccessibilityAction={done}
			onPressIn={() => {
				fill.set(
					withTiming(1, FILL, (ok) => {
						if (ok) {
							scheduleOnRN(done);
						}
					})
				);
			}}
			onPressOut={() => {
				if (finished.current) {
					return;
				}
				cancelAnimation(fill);
				fill.set(withTiming(0, RELEASE));
			}}
			style={{ borderRadius: H / 2, height: H }}
		>
			<Animated.View
				className="absolute inset-0 bg-accent"
				style={[{ transformOrigin: "left" }, style]}
			/>
			<AppText
				className="text-[16px] leading-[21px]"
				color="background"
				variant="subhead"
				weight="semibold"
			>
				{COPY.welcome.hold}
			</AppText>
		</Pressable>
	);
}
