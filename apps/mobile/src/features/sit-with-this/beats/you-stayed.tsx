import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { FONTS } from "@/design/type";
import type { SitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";

const TITLE = {
	fontFamily: FONTS.display,
	fontSize: 34,
	letterSpacing: -1.02,
	lineHeight: 35.7,
} as const;
const DRAIN_MS = 2000;
const DRAIN_OPACITY = 0.5;

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

export function StayedDone({ clock, ready, onPress }: DoneProps) {
	const drain = useAnimatedStyle(() => ({
		transform: [{ scaleX: Math.max(0, 1 - clock.closeT.get() / DRAIN_MS) }],
	}));
	return (
		<CtaButton
			dimWhenDisabled={false}
			disabled={!ready}
			label={COPY.stayed.done}
			onPress={onPress}
		>
			<Animated.View
				className="flex-1 bg-subtle"
				style={[{ opacity: DRAIN_OPACITY, transformOrigin: "right" }, drain]}
			/>
		</CtaButton>
	);
}
