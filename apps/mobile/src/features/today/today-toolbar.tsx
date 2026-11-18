import { Link } from "expo-router";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedProps,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BandBlur } from "@/components/shared/band-blur";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "./copy";
import { StreakChip } from "./header/streak-chip";
import { useToday } from "./today-data";
import { useScrolledPast } from "./today-frame";
import { clamp01, EASE_CSS, EASE_SWELL } from "./today-motion";

/** The band shows past 100 pt, the Reflect pill past 430 pt (each with 8 pt of hysteresis, live-timer-tab). */
const BAND_AT = 100;
const PILL_AT = 430;
const HYSTERESIS = 8;
const BAND_MS = 250;
const PILL_MS = 420;
/**
 * The band also follows the scroll over the 20 pt before BAND_AT, so on a fast
 * fling back up it is gone before the greeting's own chip comes into view.
 */
const HAND_OVER = 20;
/** The board's row sits 56 pt down a phone with a 60 pt safe area. */
const ROW_OFFSET = -4;
const BUTTON_H = 38;
/** The blur is at full strength down to the buttons' bottom edge, then fades out over 18 pt. */
const FADE_H = 18;
const PILL_FROM = 0.4;
/** The pill shows fully a little before its swell lands. */
const PILL_OPACITY_GAIN = 2.1;
const PENCIL = 15;

type Props = {
	scrollY: SharedValue<number>;
	flameClock: SharedValue<number>;
	live: boolean;
	reduced: boolean;
};

/**
 * Today, scrolled (collapsing-player-header): a page-tinted band with the
 * streak and "Today", and a Reflect pill (it zooms into Reflect, as the card does) that swells in once the card has
 * gone. Thresholds are read in a worklet; no React renders while scrolling.
 */
export function TodayToolbar({ scrollY, flameClock, live, reduced }: Props) {
	const page = useTokenColor("background");
	const { state, actions } = useToday();
	const insets = useSafeAreaInsets();
	const bandOn = useSharedValue(false);
	const pillOn = useSharedValue(false);
	const band = useSharedValue(0);
	const pill = useSharedValue(0);
	const touchable = useSharedValue(false);
	// The band's chip flickers only while the band shows (it sits at opacity 0 otherwise).
	const shown = useScrolledPast(scrollY, BAND_AT, HYSTERESIS);

	useAnimatedReaction(
		() => scrollY.get(),
		(y) => {
			const b = bandOn.get() ? y > BAND_AT - HYSTERESIS : y > BAND_AT;
			if (b !== bandOn.get()) {
				bandOn.set(b);
				band.set(
					withTiming(b ? 1 : 0, {
						duration: reduced ? REDUCED_FADE_MS : BAND_MS,
						easing: EASE_CSS,
						...PLAY_AS_CHOSEN,
					})
				);
			}
			// The chip and pill take touches only while the band is really there.
			const tap = b && y > BAND_AT - HAND_OVER / 2;
			if (tap !== touchable.get()) {
				touchable.set(tap);
			}
			const p = pillOn.get() ? y > PILL_AT - HYSTERESIS : y > PILL_AT;
			if (p !== pillOn.get()) {
				pillOn.set(p);
				pill.set(
					withTiming(p ? 1 : 0, {
						duration: reduced ? REDUCED_FADE_MS : PILL_MS,
						easing: EASE_SWELL,
						...PLAY_AS_CHOSEN,
					})
				);
			}
		}
	);

	const bandStyle = useAnimatedStyle(() => ({
		opacity:
			band.get() * clamp01((scrollY.get() - (BAND_AT - HAND_OVER)) / HAND_OVER),
	}));
	const bandProps = useAnimatedProps(() => ({
		pointerEvents: touchable.get() ? ("box-none" as const) : ("none" as const),
	}));
	const pillStyle = useAnimatedStyle(() => ({
		opacity: Math.min(1, pill.get() * PILL_OPACITY_GAIN),
		transform: [
			{ scale: reduced ? 1 : PILL_FROM + (1 - PILL_FROM) * pill.get() },
		],
	}));
	const pillProps = useAnimatedProps(() => ({
		pointerEvents: pill.get() > 0.5 ? ("auto" as const) : ("none" as const),
	}));
	const rowTop = insets.top + ROW_OFFSET;
	const solid = rowTop + BUTTON_H;

	return (
		<Animated.View
			animatedProps={bandProps}
			className="absolute inset-x-0 top-0"
			style={[{ height: solid + FADE_H }, bandStyle]}
		>
			<BandBlur height={solid + FADE_H} page={page} solid={solid} />
			<View
				className="absolute inset-x-4 flex-row items-center justify-between"
				pointerEvents="box-none"
				style={{ height: BUTTON_H, top: rowTop }}
			>
				<StreakChip
					clock={flameClock}
					elevated
					reduced={reduced}
					running={live && shown}
				/>
				<AppText
					accessibilityRole="header"
					className="text-[17px]"
					maxFontSizeMultiplier={1.3}
					variant="subhead"
					weight="semibold"
				>
					{COPY.title}
				</AppText>
				<Animated.View animatedProps={pillProps} style={pillStyle}>
					<Link
						asChild
						href={state.card.reflect}
						onPress={actions.pressReflect}
					>
						<Link.Trigger withAppleZoom={!reduced}>
							<PressScale
								accessibilityElementsHidden
								accessible={false}
								className="h-9.5 flex-row items-center gap-1.5 rounded-full bg-foreground pr-3.5 pl-2.5"
								importantForAccessibility="no-hide-descendants"
							>
								<Icon
									color={page}
									name={{ android: "edit", ios: "pencil" }}
									size={PENCIL}
									weight="semibold"
								/>
								<AppText
									color="background"
									maxFontSizeMultiplier={1.3}
									variant="callout"
									weight="semibold"
								>
									{COPY.reflect}
								</AppText>
							</PressScale>
						</Link.Trigger>
					</Link>
					{/* VoiceOver can't see inside the zoom source (a frameless `display: contents`
					view), so the pill is announced from here. It takes no touches: a double tap
					falls through to the pill and zooms. */}
					<View
						accessibilityHint={COPY.opensReflect}
						accessibilityLabel={COPY.reflect}
						accessibilityRole="button"
						accessible
						className="absolute inset-0"
						pointerEvents="none"
					/>
				</Animated.View>
			</View>
		</Animated.View>
	);
}
