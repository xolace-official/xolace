import { useEffect } from "react";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { VENT_COPY } from "@/features/vent/copy";
import { useVentScreen } from "@/features/vent/vent-data";

const IN_MS = 400;
const HOLD_MS = 2000;
const CAP_HOLD_MS = 3600;
const OUT_MS = 1000;

export function VentGone() {
	const { state } = useVentScreen();
	const gone = state.phase === "gone";
	const { capAfter } = state;
	const o = useSharedValue(0);
	useEffect(() => {
		if (!gone) {
			return;
		}
		o.set(
			withSequence(
				withTiming(1, { duration: IN_MS, ...PLAY_AS_CHOSEN }),
				withDelay(
					capAfter ? CAP_HOLD_MS : HOLD_MS,
					withTiming(0, { duration: OUT_MS, ...PLAY_AS_CHOSEN }),
					PLAY_AS_CHOSEN.reduceMotion
				)
			)
		);
	}, [gone, capAfter, o]);
	const style = useAnimatedStyle(() => ({ opacity: o.get() }));

	if (!gone) {
		return null;
	}
	return (
		<Animated.View
			accessibilityLiveRegion="polite"
			className="absolute inset-0 z-3 items-center justify-center gap-3 px-12"
			pointerEvents="none"
			style={style}
		>
			<AppText
				className="text-[16px] text-vent-cream/60 leading-[22px]"
				variant="body"
			>
				{VENT_COPY.gone}
			</AppText>
			{capAfter ? (
				<AppText
					center
					className="text-[14px] text-vent-cream/40 leading-[20px]"
					variant="body"
				>
					{VENT_COPY.capAfter}
				</AppText>
			) : null}
		</Animated.View>
	);
}
