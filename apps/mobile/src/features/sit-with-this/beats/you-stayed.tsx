import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { FONTS } from "@/design/type";
import type { SitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";
import { SitCta } from "../cta/sit-cta";

/** Board `.cls h2`: Bricolage 34/780, line height 1.05, −.03em (800 is the loaded cut). */
const TITLE = {
	fontFamily: FONTS.display,
	fontSize: 34,
	letterSpacing: -1.02,
	lineHeight: 35.7,
} as const;
/** Board `.cta.done::before`: a 50% ink3 overlay drains over 2 s. */
const DRAIN_MS = 2000;
const DRAIN_OPACITY = 0.5;

/** "You stayed." (board `.cls`), and the moment before moving on. */
export function StayedText() {
	return (
		<View className="items-center gap-2">
			<AppText
				accessibilityRole="header"
				center
				style={TITLE}
				variant="greeting"
			>
				{COPY.stayed.title}
			</AppText>
			<AppText center color="muted" variant="callout">
				{COPY.stayed.sub}
			</AppText>
		</View>
	);
}

type DoneProps = { clock: SitClock; ready: boolean; onPress: () => void };

/**
 * Done is there at once (production hid it for 2 s), greyed while its fill
 * drains over 2 s on the same clock; then it's enabled. As the board's CSS
 * (`transform-origin: 100%`), the grey shrinks toward the right edge. No
 * haptic here: the session end plays `playSessionComplete`, as in production.
 */
export function StayedDone({ clock, ready, onPress }: DoneProps) {
	const drain = useAnimatedStyle(() => ({
		transform: [{ scaleX: Math.max(0, 1 - clock.closeT.get() / DRAIN_MS) }],
	}));
	return (
		<SitCta disabled={!ready} label={COPY.stayed.done} onPress={onPress}>
			<Animated.View
				className="flex-1 bg-subtle"
				style={[{ opacity: DRAIN_OPACITY, transformOrigin: "right" }, drain]}
			/>
		</SitCta>
	);
}
