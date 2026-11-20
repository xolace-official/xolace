import { useEffect, useEffectEvent } from "react";
import { Pressable } from "react-native";
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { Kicker } from "@/components/shared/media-row";
import {
	EASE_OUT,
	PLAY_AS_CHOSEN,
	REDUCED_FADE_MS,
	spring,
} from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { BANNER } from "../copy";

const T = { out: 300, stay: 8000 } as const;
const FROM_Y = -16;
const SIDE = 16;
const BELOW_TOP = 8;

export function NotificationBanner({
	content,
	onDismiss,
}: {
	content: string;
	onDismiss: () => void;
}) {
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const shown = useSharedValue(0);

	// Mount only: re-running on a `reduced` flip would cancel a dismiss mid-fade.
	const enter = useEffectEvent(() => shown.set(spring("settle", 1, reduced)));
	useEffect(() => enter(), []);

	const dismiss = () => {
		shown.set(
			withTiming(
				0,
				{
					duration: reduced ? REDUCED_FADE_MS : T.out,
					easing: EASE_OUT,
					...PLAY_AS_CHOSEN,
				},
				(finished) => {
					if (finished) {
						scheduleOnRN(onDismiss);
					}
				}
			)
		);
	};
	const timedOut = useEffectEvent(dismiss);
	useEffect(() => {
		const id = setTimeout(timedOut, T.stay);
		return () => clearTimeout(id);
	}, []);

	const style = useAnimatedStyle(() => ({
		opacity: Math.min(1, shown.get()),
		transform: [
			{
				translateY: reduced ? 0 : interpolate(shown.get(), [0, 1], [FROM_Y, 0]),
			},
		],
	}));
	return (
		<Animated.View
			className="absolute z-10"
			style={[{ left: SIDE, right: SIDE, top: insets.top + BELOW_TOP }, style]}
		>
			<Pressable
				accessibilityHint={BANNER.dismiss}
				accessibilityRole="button"
				onPress={dismiss}
			>
				<GlassGroup className="flex-col items-stretch gap-0.5 rounded-tile px-4 py-3">
					<Kicker className="pt-0 pb-0">{BANNER.eyebrow.toUpperCase()}</Kicker>
					<AppText variant="callout">{content}</AppText>
					<AppText className="mt-1" color="subtle" variant="caption">
						{BANNER.dismiss}
					</AppText>
				</GlassGroup>
			</Pressable>
		</Animated.View>
	);
}
