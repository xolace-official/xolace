import { View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { OFFLINE_BANNER } from "./copy";

const WIFI_OFF = { android: "wifi_off", ios: "wifi.slash" } as const;
const GAP = 4;
const ICON_SIZE = 12;
const ENTER_MS = 260;
const EXIT_MS = 180;

const enter = (reduced: boolean) =>
	(reduced
		? FadeIn.duration(REDUCED_FADE_MS)
		: SlideInUp.duration(ENTER_MS)
	).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
const exit = (reduced: boolean) =>
	FadeOut.duration(reduced ? REDUCED_FADE_MS : EXIT_MS).reduceMotion(
		PLAY_AS_CHOSEN.reduceMotion
	);

/**
 * The pill just under the status bar. Taps pass through it to whatever is beneath, so it
 * never takes a header button away.
 */
export function OfflineStrip({ reduced }: { reduced: boolean }) {
	const { top } = useSafeAreaInsets();
	const muted = useTokenColor("muted");
	return (
		<Animated.View
			className="absolute inset-x-0 items-center"
			entering={enter(reduced)}
			exiting={exit(reduced)}
			pointerEvents="none"
			style={{ top: top + GAP }}
		>
			<View
				accessibilityLabel={OFFLINE_BANNER.label}
				accessible
				className="flex-row items-center gap-1.5 rounded-full border border-border/50 bg-surface-secondary px-3 py-1.5 shadow-card"
			>
				<Icon color={muted} name={WIFI_OFF} size={ICON_SIZE} />
				<AppText color="muted" variant="footnote" weight="semibold">
					{OFFLINE_BANNER.banner}
				</AppText>
			</View>
		</Animated.View>
	);
}
