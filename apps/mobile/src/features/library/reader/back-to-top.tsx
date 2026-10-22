import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { Pressable } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	type SharedValue,
	useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { AppText } from "@/src/components/shared/app-text";

const UP_ICON = {
	android: "arrow_upward",
	ios: "arrow.up",
	web: "arrow_upward",
} as const;

/**
 * Absent while reading; fades in only once the reader reaches the end. Owns
 * its `show` state so crossing the end re-renders this and nothing else.
 * `bottom` is where it rests — the mini-player ticket raises it above the dock.
 */
export function BackToTop({
	scrollY,
	endAt,
	bottom,
	onPress,
}: {
	scrollY: SharedValue<number>;
	/** Scroll offset at which the reader counts as at the end. */
	endAt: number;
	bottom: number;
	onPress: () => void;
}) {
	const [show, setShow] = useState(false);
	const foreground = useThemeColor("foreground");
	useAnimatedReaction(
		() => scrollY.get() >= endAt,
		(now, was) => {
			if (now !== was) {
				scheduleOnRN(setShow, now);
			}
		}
	);

	if (!show) {
		return null;
	}
	return (
		<Animated.View
			className="absolute inset-x-0 items-center"
			entering={FadeIn.duration(200)}
			exiting={FadeOut.duration(150)}
			pointerEvents="box-none"
			style={{ bottom }}
		>
			<Pressable
				accessibilityLabel="Back to top"
				accessibilityRole="button"
				className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 active:opacity-70"
				onPress={onPress}
			>
				<SymbolView name={UP_ICON} size={14} tintColor={foreground} />
				<AppText className="font-semibold text-sm">Back to top</AppText>
			</Pressable>
		</Animated.View>
	);
}
