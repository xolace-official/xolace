import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import { COPY } from "../copy";
import { EASE } from "../peers-ease";
import { CHIP, LAYOUT } from "../peers-look";
import { RollingDigits } from "./rolling-digits";

const L = LAYOUT.chip;
const LABEL = { fontSize: L.label, lineHeight: L.labelLine } as const;

type Props = { on: boolean; others: number; reduced: boolean };

export function FeltLabel({ on, others, reduced }: Props) {
	const lab = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		lab.set(
			withTiming(on ? 1 : 0, {
				duration: reduced ? REDUCED_FADE_MS : CHIP.labelMs,
				easing: EASE.label,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [on, reduced, lab]);
	const rise = reduced ? 0 : CHIP.labelRise;
	const labelA = useAnimatedStyle(() => ({
		opacity: 1 - clamp01(lab.get()),
		transform: [{ translateY: -rise * lab.get() }],
	}));
	const labelB = useAnimatedStyle(() => ({
		opacity: clamp01(lab.get()),
		transform: [{ translateY: rise * (1 - lab.get()) }],
	}));
	const [wideB, setWideB] = useState(0);
	return (
		<View style={{ minWidth: wideB }}>
			<Animated.View style={labelA}>
				<AppText
					color="muted"
					numberOfLines={1}
					style={LABEL}
					variant="footnote"
					weight="semibold"
				>
					{COPY.felt}
				</AppText>
			</Animated.View>
			<Animated.View
				className="absolute top-0 left-0 flex-row"
				onLayout={(e) => setWideB(e.nativeEvent.layout.width)}
				style={labelB}
			>
				<OnLabel on={on} others={others} reduced={reduced} />
			</Animated.View>
		</View>
	);
}

function OnLabel({
	on,
	others,
	reduced,
}: {
	on: boolean;
	others: number;
	reduced: boolean;
}) {
	if (others === 0) {
		return (
			<AppText style={LABEL} variant="footnote" weight="semibold">
				{COPY.you(0)}
			</AppText>
		);
	}
	const [before, after] = COPY.you(others).split(String(others));
	return (
		<>
			<AppText style={LABEL} variant="footnote" weight="semibold">
				{before}
			</AppText>
			<RollingDigits play={on && !reduced} style={LABEL} value={others} />
			<AppText style={LABEL} variant="footnote" weight="semibold">
				{after}
			</AppText>
		</>
	);
}
