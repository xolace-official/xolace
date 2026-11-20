import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FONTS } from "@/design/type";
import { COPY } from "../copy";
import { LAYOUT } from "../sit-look";

const REVEAL = { baseMs: 120, dy: 14, ms: 450, staggerMs: 80 } as const;
const NAME = {
	fontFamily: FONTS.display,
	fontSize: 36,
	letterSpacing: -1.15,
	lineHeight: 36.72,
} as const;
const LENGTH = { fontSize: 15.5, lineHeight: 22.5, marginTop: 2 } as const;

export function Rise({
	order,
	reduced,
	children,
}: {
	order: number;
	reduced: boolean;
	children: ReactNode;
}) {
	const y = useSharedValue<number>(reduced ? 0 : REVEAL.dy);
	useEffect(() => {
		if (reduced) {
			y.set(0);
			return;
		}
		y.set(
			withDelay(
				REVEAL.baseMs + order * REVEAL.staggerMs,
				withTiming(0, {
					duration: REVEAL.ms,
					easing: Easing.out(Easing.cubic),
					...PLAY_AS_CHOSEN,
				})
			)
		);
	}, [order, reduced, y]);
	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: y.get() }],
	}));
	return <Animated.View style={style}>{children}</Animated.View>;
}

export function PreRoll({
	name,
	length,
	reduced,
}: {
	name: string;
	length: string;
	reduced: boolean;
}) {
	return (
		<View className="items-center" style={{ gap: LAYOUT.pre.gap }}>
			<Rise order={0} reduced={reduced}>
				<AppText
					className="tracking-[0.13px]"
					color="muted"
					variant="footnote"
					weight="semibold"
				>
					{COPY.eyebrow}
				</AppText>
			</Rise>
			<Rise order={1} reduced={reduced}>
				<AppText
					accessibilityRole="header"
					center
					style={NAME}
					variant="display"
				>
					{name}
				</AppText>
			</Rise>
			<Rise order={2} reduced={reduced}>
				<AppText center color="muted" style={LENGTH} variant="callout">
					{length}
				</AppText>
			</Rise>
		</View>
	);
}
