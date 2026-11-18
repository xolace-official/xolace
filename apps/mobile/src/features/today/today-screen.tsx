import { type ReactNode, useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { useScheme } from "@/design/scheme";
import { useClock, useLive } from "@/lib/motion/clock";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useQualityGate } from "@/lib/motion/use-quality-gate";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
import { CampfireCard } from "./campfire/campfire-card";
import { TodayHeader } from "./header/today-header";
import { ReflectCard } from "./hero/reflect-card";
import { KindlingCard } from "./kindling/kindling-card";
import { LateModules } from "./late/late-modules";
import { MomentsSection } from "./moments/moments-section";
import { ListenRail } from "./rail/listen-rail";
import { SkyCanvas } from "./sky/sky-canvas";
import { skyTop } from "./sky/sky-model";
import { useToday } from "./today-data";
import { TodayFrame, type TodayFrameValue } from "./today-frame";
import { TodaySlot } from "./today-slot";
import { TodayToolbar } from "./today-toolbar";
import { WordCard } from "./word/word-card";

const BOTTOM_ROOM = 150;
/** Page padding each side. */
const PAGE_X = 16;
/** Long enough for the words, the rise and the ink (450 + 2400 ms) to finish. */
const INTRO_WINDOW_MS = 3200;

type Props = {
	/**
	 * Another feature's card the route composes in, under the campfire by day: the intake's
	 * "How did you find Xolace?" (features meet in routes, not screens).
	 */
	finding?: ReactNode;
	/**
	 * The launch cover has started leaving (`useLaunchRevealed`, from the route). While it is
	 * up, a first open of the day waits to mount the page, so its rise and greeting play
	 * under the cover's fade; at rest the page draws under the cover. Fixtures: always.
	 */
	revealed?: boolean;
};

/** Today: a sky that keeps the hour, the Reflect card as its horizon, then up to five quiet modules. */
export function TodayScreen({ finding, revealed = true }: Props) {
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
					{state.intro && !revealed ? null : (
						<TodayBody
							finding={finding}
							flameClock={flameClock}
							// A new day (Today stays mounted for days) replays the first open, once.
							key={state.day}
							live={live}
							reduced={reduced}
							scrollY={scrollY}
							viewH={height}
						/>
					)}
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
	finding: ReactNode;
};

/** The page under the sky: the header, the hero and the modules for the hour. */
function TodayBody({ flameClock, finding, ...frame }: BodyProps) {
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
			<ReflectCard />
			{late ? (
				<LateModules />
			) : (
				<>
					<KindlingCard width={width - PAGE_X * 2} />
					<CampfireCard />
					{finding ? <TodaySlot>{finding}</TodaySlot> : null}
					<ListenRail />
					<MomentsSection />
					<WordCard />
				</>
			)}
		</TodayFrame>
	);
}
