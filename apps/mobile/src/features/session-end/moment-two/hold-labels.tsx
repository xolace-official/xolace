import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "../copy";
import { EASE, HOLD, LAYOUT } from "../session-look";

const C = LAYOUT.card;
const LABEL_MAX = 1.4;

const LABELS = [
	COPY.share.leave,
	COPY.share.holding,
	COPY.share.letGo,
] as const;

export function HoldLabels({
	hold,
	reduced,
}: {
	hold: number;
	reduced: boolean;
}) {
	return (
		<View className="items-center justify-center">
			{LABELS.map((l, i) => (
				<Label
					at={i - hold}
					first={i === 0}
					key={l}
					reduced={reduced}
					text={l}
				/>
			))}
		</View>
	);
}

function Label({
	text,
	at,
	reduced,
	first,
}: {
	text: string;
	at: number;
	reduced: boolean;
	first: boolean;
}) {
	const shown = useSharedValue(at === 0 ? 1 : 0);
	const dy = useSharedValue(
		at === 0 ? 0 : at > 0 ? HOLD.label.rise : -HOLD.label.rise
	);
	useEffect(() => {
		shown.set(
			withTiming(at === 0 ? 1 : 0, {
				duration: HOLD.label.fade,
				...PLAY_AS_CHOSEN,
			})
		);
		const to =
			at === 0 || reduced ? 0 : at > 0 ? HOLD.label.rise : -HOLD.label.rise;
		dy.set(
			withTiming(to, {
				duration: HOLD.label.move,
				easing: EASE.label,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [at, reduced, shown, dy]);
	const style = useAnimatedStyle(() => ({
		opacity: shown.get(),
		transform: [{ translateY: dy.get() }],
	}));
	return (
		<Animated.View className={first ? undefined : "absolute"} style={style}>
			<AppText
				color="background"
				maxFontSizeMultiplier={LABEL_MAX}
				style={{ fontSize: C.button }}
				variant="callout"
				weight="semibold"
			>
				{text}
			</AppText>
		</Animated.View>
	);
}
