import { useEffect, useRef } from "react";
import { Pressable } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { BANNER } from "../copy";

/** Production's banner: in over 400 ms, out over 300 (ease-in-out quad), gone after 8 s. */
const T = {
	ease: Easing.bezier(0.455, 0.03, 0.515, 0.955),
	in: 400,
	out: 300,
	stay: 8000,
} as const;
const SIDE = 20;
const BELOW_TOP = 8;
const SHADOW = "0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)";
const EYEBROW = { fontSize: 11 } as const;
const BODY = { fontSize: 14, lineHeight: 20 } as const;
const HINT = { fontSize: 10 } as const;

/**
 * "You were reached": the in-app banner for a notification tapped open while the app ran,
 * over Today. Tap, or 8 s, and it fades away.
 */
export function NotificationBanner({
	content,
	onDismiss,
}: {
	content: string;
	onDismiss: () => void;
}) {
	const insets = useSafeAreaInsets();
	const shown = useSharedValue(0);

	useEffect(() => {
		shown.set(
			withTiming(1, { duration: T.in, easing: T.ease, ...PLAY_AS_CHOSEN })
		);
	}, [shown]);

	const dismiss = () => {
		shown.set(
			withTiming(
				0,
				{ duration: T.out, easing: T.ease, ...PLAY_AS_CHOSEN },
				(finished) => {
					if (finished) {
						scheduleOnRN(onDismiss);
					}
				}
			)
		);
	};
	const later = useRef(dismiss);
	later.current = dismiss;
	useEffect(() => {
		const id = setTimeout(() => later.current(), T.stay);
		return () => clearTimeout(id);
	}, []);

	const style = useAnimatedStyle(() => ({ opacity: shown.get() }));
	return (
		<Animated.View
			className="absolute z-10 rounded-2xl"
			style={[
				{
					boxShadow: SHADOW,
					left: SIDE,
					right: SIDE,
					top: insets.top + BELOW_TOP,
				},
				style,
			]}
		>
			<Pressable
				accessibilityHint={BANNER.dismiss}
				accessibilityRole="button"
				className="rounded-2xl border border-border/40 bg-surface px-4 py-3"
				onPress={dismiss}
			>
				<AppText
					className="mb-0.5 text-foreground/40 uppercase tracking-wide"
					style={EYEBROW}
					variant="caption"
				>
					{BANNER.eyebrow}
				</AppText>
				<AppText className="text-foreground/85" style={BODY} variant="callout">
					{content}
				</AppText>
				<AppText
					className="mt-1.5 text-foreground/30"
					style={HINT}
					variant="caption"
				>
					{BANNER.dismiss}
				</AppText>
			</Pressable>
		</Animated.View>
	);
}
