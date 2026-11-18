import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { AuroraArc } from "@/components/shared/aurora-arc";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import { BarTitle } from "@/features/you/steadiness/dial/bar-title";
import { DialCard } from "@/features/you/steadiness/dial/dial-card";
import { DOMAIN_ICON } from "@/features/you/steadiness/parts/domain-icon";
import { PartsSection } from "@/features/you/steadiness/parts/parts-section";
import {
	RING_DELAY_MS,
	RING_FILL_MS,
	RING_STAGGER_MS,
} from "@/features/you/steadiness/parts/ring";
import { useSteadinessScreen } from "@/features/you/steadiness/steadiness-data";
import { useSteadinessUi } from "@/features/you/steadiness/steadiness-ui";
import { useHeaderOptions } from "@/lib/header-options";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const S = COPY.steadinessScreen;
/** iOS draws the content under its transparent bar; Android's bar is opaque, above it (as
 * Lantern's hub). */
const UNDER_THE_BAR = Platform.OS === "ios";
/** Content starts 8 pt under the bar (the board's 112 under a 104 bar). */
const BAR = 50;
const UNDER_BAR = 8;
const SIDE = 20;
const GAP = 12;
/** Clears the floating tab bar. */
const TAB_CLEAR = 96;
/** The dial's number passes under the bar this far down the content (the board's `heroEnd`). */
const NUMBER_BOTTOM = 200;
/** The chip springs in (steadiness.md §4.2) and leaves in 150 ms linear. */
const CHIP_SPRING = { damping: 14, stiffness: 320, ...PLAY_AS_CHOSEN };
const CHIP_OUT = { duration: 150, easing: Easing.linear, ...PLAY_AS_CHOSEN };
const CHIP_FADE = { duration: 200, ...PLAY_AS_CHOSEN };
/** Every domain the server can send, so the clock runs long enough for the last ring. */
const MAX_PARTS = Object.keys(DOMAIN_ICON).length;
const RINGS_MS =
	RING_DELAY_MS + (MAX_PARTS - 1) * RING_STAGGER_MS + RING_FILL_MS;
const AURORA = 280;

/**
 * Steadiness (steadiness.md): production's screen, kept nearly as it is. The glass dial with the
 * Xolace face above the number, the parts of your life as rings or tick meters with a detail
 * card, and every one of production's doors into Xolace+. Scrolling the number under the bar
 * docks the dial there as a chip, on the UI thread; React hears only the crossing.
 */
export function SteadinessScreen() {
	const header = useHeaderOptions("small");
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const { state, actions } = useSteadinessScreen();
	const { toParts } = useSteadinessUi();
	const scroll = useAnimatedRef<Animated.ScrollView>();
	const chip = useSharedValue(0);
	const isDocked = useSharedValue(false);
	const [docked, setDocked] = useState(false);
	const scrollY = useSharedValue(0);
	const upsellMid = useSharedValue(-1);
	// The dock threshold below is in content offset, so it holds on both once this is right.
	const top = UNDER_THE_BAR ? insets.top + BAR + UNDER_BAR : UNDER_BAR;
	const lit = state?.dial.lit === true;
	const score = state?.dial.lit ? state.dial.score : null;

	// One clock for every ring's fill, once per visit, from when the parts first draw.
	const ready = state !== undefined;
	const rings = useSharedValue(reduced ? RINGS_MS : 0);
	useEffect(() => {
		if (ready && !reduced) {
			rings.set(
				withTiming(RINGS_MS, {
					duration: RINGS_MS,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	}, [rings, reduced, ready]);

	const onScroll = useAnimatedScrollHandler((e) => {
		const y = e.contentOffset.y;
		scrollY.set(y);
		const mid = upsellMid.get();
		if (mid >= 0 && mid - y < height) {
			upsellMid.set(-1);
			scheduleOnRN(actions.upsellSeen);
		}
		const now = lit && y > UNDER_BAR + NUMBER_BOTTOM;
		if (now === isDocked.get()) {
			return;
		}
		isDocked.set(now);
		chip.set(
			reduced
				? withTiming(now ? 1 : 0, CHIP_FADE)
				: now
					? withSpring(1, CHIP_SPRING)
					: withTiming(0, CHIP_OUT)
		);
		scheduleOnRN(setDocked, now);
	});

	/** The heavier-lately line is spent once its middle is on screen. */
	const placeUpsell = (y: number, h: number) => {
		const mid = y + h / 2;
		if (mid - scrollY.get() < height) {
			actions.upsellSeen();
		} else {
			upsellMid.set(mid);
		}
	};

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen
				options={{
					...header,
					headerShown: true,
					headerTitle: () => (
						<BarTitle
							chip={chip}
							docked={docked}
							onTop={() =>
								scroll.current?.scrollTo({ animated: !reduced, y: 0 })
							}
							reduced={reduced}
							score={score}
						/>
					),
					title: S.title,
				}}
			/>
			<Animated.ScrollView
				contentContainerStyle={{
					gap: GAP,
					paddingBottom: insets.bottom + TAB_CLEAR,
					paddingHorizontal: SIDE,
					paddingTop: top,
				}}
				contentInsetAdjustmentBehavior="never"
				onScroll={onScroll}
				ref={scroll}
				scrollEventThrottle={16}
			>
				{/* Inside the scroll view, so it stays the screen's first descendant (UIKit finds it
				    for the bar's soft edge); the glow scrolls with the content, as production's. */}
				<AuroraArc height={insets.top + AURORA} />
				{state ? (
					<>
						<DialCard running={!docked} />
						<PartsSection
							clock={rings}
							onPartsY={(y) => {
								if (toParts) {
									scroll.current?.scrollTo({ animated: false, y: y - top });
								}
							}}
							onUpsellPlaced={placeUpsell}
						/>
						<AppText
							className="mt-2 px-4 text-center text-[12px] leading-[19.2px]"
							color="subtle"
							variant="caption"
						>
							{S.caveat}
						</AppText>
					</>
				) : null}
			</Animated.ScrollView>
		</View>
	);
}
