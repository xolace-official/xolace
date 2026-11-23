import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
const PAGE_X = 16;
const INTRO_WINDOW_MS = 3200;

type Props = {
	finding?: ReactNode;
	revealed?: boolean;
	pill?: (fallback: ReactNode) => ReactNode;
};

export function TodayScreen({ finding, pill, revealed = true }: Props) {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const { state } = useToday();
	const late = state.phase === "late";
	const focused = useIsFocused();
	const top = skyTop(state.phase, useScheme() === "dark");
	const reduced = useEffectiveReducedMotion();
	const live = useLive(reduced);
	const tail = useMiniPlayerInset();
	const scrollY = useSharedValue(0);
	const flameClock = useClock(live && state.streak !== null);

	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});

	return (
		<View className="flex-1 bg-background">
			{late && focused ? <StatusBar style="light" /> : null}
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
						finding={finding}
						flameClock={flameClock}
						key={state.day}
						live={live}
						pill={pill}
						reduced={reduced}
						revealed={revealed}
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

type BodyProps = Omit<TodayFrameValue, "intro" | "low" | "waiting"> & {
	flameClock: SharedValue<number>;
	finding: ReactNode;
	pill: Props["pill"];
	revealed: boolean;
};

function TodayBody({
	flameClock,
	finding,
	pill,
	revealed,
	...frame
}: BodyProps) {
	const { width } = useWindowDimensions();
	const { state } = useToday();
	const [intro, setIntro] = useState(state.intro);
	const waiting = intro && !revealed;
	useEffect(() => {
		if (!intro || waiting) {
			return;
		}
		const id = setTimeout(() => setIntro(false), INTRO_WINDOW_MS);
		return () => clearTimeout(id);
	}, [intro, waiting]);
	const low = useQualityGate(intro && !waiting);
	const late = state.phase === "late";

	return (
		<TodayFrame value={{ ...frame, intro, low, waiting }}>
			<SkyCanvas phase={state.phase} width={width} />
			<View className="mx-4">
				<TodayHeader flameClock={flameClock} pill={pill} />
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
