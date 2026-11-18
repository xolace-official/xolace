import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { useScheme } from "@/design/scheme";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
import { TodayHeader } from "./header/today-header";
import { LateModules } from "./late/late-modules";
import { SkyCanvas } from "./sky/sky-canvas";
import { skyTop } from "./sky/sky-model";
import { useClock, useLive } from "./today-clock";
import { useToday } from "./today-data";
import { TodayFrame, type TodayFrameValue } from "./today-frame";
import { TodayToolbar } from "./today-toolbar";
import { useQualityGate } from "./use-quality-gate";

const BOTTOM_ROOM = 150;
/** Long enough for the words, the rise and the ink (450 + 2400 ms) to finish. */
const INTRO_WINDOW_MS = 3200;

/** Today: a sky that keeps the hour, the Reflect card as its horizon, then up to five quiet modules. */
export function TodayScreen() {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const { state } = useToday();
	const late = state.phase === "late";
	const top = skyTop(state.phase, useScheme() === "dark");
	const reduced = useEffectiveReducedMotion();
	const live = useLive(reduced);
	const tail = useMiniPlayerInset();
	const scrollY = useSharedValue(0);
	// The streak flame's flicker, shared by the header's chip and the toolbar's; still
	// while there's no streak to show.
	const flameClock = useClock(live && state.streak !== null);

	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});

	return (
		<View className="flex-1 bg-background">
			{/*
				The tab bar finds its scroll view only through this marker: Today sits in a stack
				inside a native tab, and UIKit's own search stops at the tab. The top edge effect is
				off (the toolbar band is Today's own); the bottom one sits under the tab bar.
			*/}
			<ScrollViewMarker
				scrollEdgeEffects={{ top: "hidden" }}
				style={{ flex: 1 }}
			>
				<Animated.ScrollView
					contentContainerStyle={{
						paddingBottom: BOTTOM_ROOM + tail,
						paddingTop: insets.top,
					}}
					contentInsetAdjustmentBehavior="never"
					onScroll={onScroll}
					scrollEnabled={!late}
					scrollEventThrottle={16}
					showsVerticalScrollIndicator={false}
				>
					<View
						className="absolute inset-x-0"
						pointerEvents="none"
						style={{ backgroundColor: top, height, top: -height }}
					/>
					<TodayBody
						flameClock={flameClock}
						// A new day (Today stays mounted for days) replays the first open, once.
						key={state.day}
						live={live}
						reduced={reduced}
						scrollY={scrollY}
						viewH={height}
					/>
				</Animated.ScrollView>
			</ScrollViewMarker>
			{late ? null : (
				<TodayToolbar
					flameClock={flameClock}
					live={live}
					reduced={reduced}
					scrollY={scrollY}
				/>
			)}
		</View>
	);
}

type BodyProps = Omit<TodayFrameValue, "intro" | "low"> & {
	flameClock: SharedValue<number>;
};

/** The page under the sky: the header, the hero and the modules for the hour. */
function TodayBody({ flameClock, ...frame }: BodyProps) {
	const { width } = useWindowDimensions();
	const { state } = useToday();
	// The first open of the day plays once: anything that mounts after this window
	// (a phase change, a remount) shows at rest.
	const [intro, setIntro] = useState(state.intro);
	useEffect(() => {
		if (!intro) {
			return;
		}
		const id = setTimeout(() => setIntro(false), INTRO_WINDOW_MS);
		return () => clearTimeout(id);
	}, [intro]);
	const low = useQualityGate(intro);
	const late = state.phase === "late";

	return (
		<TodayFrame value={{ ...frame, intro, low }}>
			<SkyCanvas phase={state.phase} width={width} />
			<View className="mx-4">
				<TodayHeader flameClock={flameClock} />
			</View>
			{/* S1b: the Reflect card, the sky's horizon. */}
			{late ? <LateModules /> : null}
			{/* S1c, S1d: kindling, campfire, the rail, moments and the word. */}
		</TodayFrame>
	);
}
