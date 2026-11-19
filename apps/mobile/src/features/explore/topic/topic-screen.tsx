import { Stack, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { useScheme } from "@/design/scheme";
import { COPY, type TopicFilter } from "@/features/explore/copy";
import { hasBothKinds, initialFilter } from "@/features/explore/explore-model";
import { PIN_AT, TOPIC } from "@/features/explore/explore-style";
import { FoldedEdge } from "@/features/explore/folded-edge";
import { RowsSkeleton } from "@/features/explore/rows/rows-skeleton";
import { BarTitle } from "@/features/explore/topic/bar-title";
import { TopicChips } from "@/features/explore/topic/topic-chips";
import {
	CoverName,
	CoverZoomTarget,
	TopicCover,
} from "@/features/explore/topic/topic-cover";
import { useTopicScreen } from "@/features/explore/topic/topic-data";
import { TopicSections } from "@/features/explore/topic/topic-sections";
import { useSwap } from "@/features/explore/topic/use-swap";
import { useHeaderOptions } from "@/lib/header-options";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

/** The bar's height below the safe area: the cover and the pin measure from it. */
const NAV_BAR = 44;
/** iOS runs the cover under a see-through bar; Android's bar is opaque, the cover below it. */
const UNDER_BAR = Platform.OS === "ios";
const GONE_GAP = 48;

/**
 * A topic, v2 (handoff `explore-doors.md` §4): the cover under a transparent bar with the name on
 * it, a sheet with Explore's chips when the topic holds both kinds, and the grouped list. At the
 * pin the chips stay under the bar, the page fills in behind it and the name moves up into it.
 */
export function TopicScreen() {
	const { state } = useTopicScreen();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const dark = useScheme() === "dark";
	const header = useHeaderOptions("small");
	const [foreground, coverInk] = useTokenColors(["foreground", "cover-ink"]);
	const topic = state.header;
	const chips = topic ? hasBothKinds(topic) : false;
	// null until someone picks: `?family=` decides once the header says there are chips.
	const [picked, setPicked] = useState<TopicFilter | null>(null);
	const filter = picked ?? initialFilter(state.family, chips);
	const [pinned, setPinned] = useState(false);
	const barBottom = UNDER_BAR ? insets.top + NAV_BAR : 0;
	const coverHeight = barBottom + TOPIC.coverBelow;

	const scroll = useAnimatedRef<Animated.ScrollView>();
	const y = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		y.set(e.contentOffset.y);
	});
	useAnimatedReaction(
		() => y.get() >= PIN_AT,
		(now, prev) => {
			if (now !== prev) {
				scheduleOnRN(setPinned, now);
			}
		}
	);
	const swap = useSwap(() => {
		if (y.get() > PIN_AT) {
			scroll.current?.scrollTo({ animated: false, y: PIN_AT });
		}
	}, reduced);
	const choose = (v: TopicFilter) => {
		if (v !== filter) {
			swap.run(() => setPicked(v));
		}
	};
	// On the cover: white ink. Pinned, or with no cover to sit on, the page's.
	const onCover = UNDER_BAR && topic != null && !pinned;

	return (
		<>
			<Stack.Screen
				options={{
					...header,
					// The cover runs under the bar with its own band: no soft edge, no blur.
					headerBlurEffect: undefined,
					headerTintColor: onCover ? coverInk : foreground,
					headerTitle: () => <BarTitle on={pinned} text={topic?.title ?? ""} />,
					scrollEdgeEffects: { top: "hidden" },
				}}
			/>
			{focused ? (
				<StatusBar style={onCover || dark ? "light" : "dark"} />
			) : null}
			<Animated.ScrollView
				className="bg-background"
				// iOS: the cover runs under the bar, so offset 0 is the top of the screen.
				contentInsetAdjustmentBehavior="never"
				onScroll={onScroll}
				ref={scroll}
				scrollEventThrottle={16}
			>
				{topic === null ? (
					<AppText
						center
						className="px-8"
						color="muted"
						style={{ paddingTop: barBottom + GONE_GAP }}
						variant="callout"
					>
						{COPY.topicGone}
					</AppText>
				) : (
					<>
						{topic ? (
							<TopicCover header={topic} height={coverHeight} y={y} />
						) : (
							<View
								className="absolute inset-x-0 top-0 bg-surface-secondary"
								style={{ height: coverHeight }}
							/>
						)}
						<View style={{ height: barBottom + TOPIC.spacerBelow }}>
							{topic ? <CoverName header={topic} hidden={pinned} /> : null}
						</View>
						<View
							className="border-continuous bg-background"
							style={{
								borderTopLeftRadius: TOPIC.sheetR,
								borderTopRightRadius: TOPIC.sheetR,
								marginTop: -TOPIC.sheetOverlap,
								// At least a screen below the bar, plus the bottom clearance, so even a
								// short list can scroll past the pin.
								minHeight: height - barBottom + TOPIC.bottom,
								paddingBottom: TOPIC.bottom,
							}}
						>
							{chips ? (
								<TopicChips
									onChange={choose}
									pinned={pinned}
									value={filter}
									y={y}
								/>
							) : null}
							{topic && state.tracks ? (
								<Animated.View style={swap.style}>
									<TopicSections
										chips={chips}
										filter={chips ? filter : "all"}
										listen={state.listen}
										tracks={state.tracks}
									/>
								</Animated.View>
							) : (
								<View style={{ paddingTop: TOPIC.soloTop }}>
									<RowsSkeleton count={5} />
								</View>
							)}
						</View>
					</>
				)}
			</Animated.ScrollView>
			{UNDER_BAR ? (
				<FoldedEdge barBottom={barBottom} fade={0} on={pinned} />
			) : null}
			<CoverZoomTarget height={coverHeight} />
		</>
	);
}
