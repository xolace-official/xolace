import { Link, Stack, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AudioDock, DOCK_H } from "@/features/lantern/reader/audio-dock";
import {
	FOLD,
	useFold,
	useFoldStyles,
} from "@/features/lantern/reader/cover-fold";
import { PageContent } from "@/features/lantern/reader/page-content";
import {
	BarRow,
	BarWindow,
	CoverPhoto,
} from "@/features/lantern/reader/reader-bar";
import { ReaderTitle } from "@/features/lantern/reader/reader-body";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import { FireDim } from "@/features/lantern/reader/reader-extras";
import {
	endOfRead,
	pickUpAt,
	resumeOnOpen,
} from "@/features/lantern/reader/reader-model";
import { ReaderPageScope } from "@/features/lantern/reader/reader-page";
import { BackToTop, PickUpPill } from "@/features/lantern/reader/reader-pills";
import {
	useKeepPlace,
	useLeaveAt,
	useOpenAt,
	useReachEnd,
	useStartAt,
} from "@/features/lantern/reader/reader-scroll";
import { READING_MODES } from "@/features/lantern/reader/reading-modes";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const PILL_GAP = 16;
const SHEET_BOTTOM = 96;

/** The Lantern reader on its reading mode's page (handoff §5). The Aa sheet sits outside it. */
export function ReaderScreen({
	startAt,
}: {
	/** Dev states only: open scrolled this far; negative counts from the end. */
	startAt?: number;
}) {
	const { mode } = useReaderScreen().state.prefs;
	return (
		<ReaderPageScope page={READING_MODES[mode].page}>
			<ReaderView startAt={startAt} />
		</ReaderPageScope>
	);
}

/**
 * Production's cover fold, in the redesign's type and colours. New in v2: Pick up at 40%, minutes
 * left in the bar, and the place kept when the Aa sheet reflows the text. React never hears
 * about the scroll.
 */
function ReaderView({ startAt }: { startAt?: number }) {
	const { state, actions } = useReaderScreen();
	const insets = useSafeAreaInsets();
	// The Aa sheet leaves the reader touchable: the bar and swipe back go inert under it.
	const focused = useIsFocused();
	const reduced = useEffectiveReducedMotion();
	// From the hook, not `bg-background`: the class misses the scoped page here (#401).
	const page = useTokenColor("background");
	const f = useFold();
	const [contentH, setContentH] = useState(1);
	const [viewH, setViewH] = useState(1);
	const [articleEnd, setArticleEnd] = useState(0);
	const scroll = useAnimatedRef<Animated.ScrollView>();
	const y = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		y.set(e.contentOffset.y);
	});
	const maxScroll = contentH - viewH;
	const dockH = state.audio.started ? DOCK_H : 0;
	const endAt = endOfRead({
		articleEnd,
		bottom: insets.bottom + dockH,
		maxScroll,
		sheetTop: f.coverH - FOLD.sheetOverlap,
		viewH,
	});
	const styles = useFoldStyles(y, f, maxScroll);
	const position = state.signals?.position;
	const toY = (to: number) =>
		scroll.current?.scrollTo({ animated: !reduced, y: to });
	const toTop = () => toY(0);
	const resume = () => {
		actions.resumed();
		toY((position ?? 0) * maxScroll);
	};

	useOpenAt(resumeOnOpen(state.opensAt, position), maxScroll, scroll);
	useStartAt(startAt, maxScroll, scroll);
	useKeepPlace(state.prefs.mode, state.prefs.size, y, maxScroll, scroll);
	useLeaveAt(y, maxScroll, actions.leaveAt);
	useReachEnd(y, endAt, actions.reachEnd);

	const title = (
		<ReaderTitle
			onBackToTop={toTop}
			onCover={!f.ax}
			onResume={position && maxScroll > 0 ? resume : undefined}
		/>
	);
	const pillBottom = insets.bottom + dockH + PILL_GAP;

	return (
		<View
			className="flex-1"
			onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
			style={{ backgroundColor: page }}
		>
			{/* No swipe back while the Aa sheet is up (production's `gestureEnabled: focused`). */}
			<Stack.Screen options={{ gestureEnabled: focused }} />
			{focused ? <StatusBar style="light" /> : null}
			{/* Cover-sized, so a photo card zooms into the photo. Hidden from screen readers. */}
			<Link.AppleZoomTarget>
				<View
					accessibilityElementsHidden
					className="absolute inset-x-0 top-0"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={{ height: f.coverH }}
				>
					<CoverPhoto f={f} style={styles.photo} />
				</View>
			</Link.AppleZoomTarget>
			<Animated.ScrollView
				contentInsetAdjustmentBehavior="never"
				onContentSizeChange={(_, h) => setContentH(h)}
				onScroll={onScroll}
				ref={scroll}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				<Animated.View
					className="justify-end px-6 pb-12"
					pointerEvents="none"
					style={[{ height: f.coverH - FOLD.sheetOverlap }, styles.largeTitle]}
				>
					{f.ax ? null : title}
				</Animated.View>
				<View
					className="rounded-t-[28px] px-6 pt-6"
					style={{
						backgroundColor: page,
						borderCurve: "continuous",
						minHeight: f.screenH,
						paddingBottom: insets.bottom + dockH + SHEET_BOTTOM,
					}}
				>
					<PageContent
						onArticleEnd={setArticleEnd}
						title={f.ax ? title : null}
					/>
				</View>
			</Animated.ScrollView>
			<BarWindow f={f} styles={styles} />
			<BarRow
				f={f}
				inert={!focused}
				maxScroll={maxScroll}
				titleStyle={styles.barTitle}
				y={y}
			/>
			<FireDim />
			<PickUpPill
				at={maxScroll > 0 ? pickUpAt(state.opensAt, position) : null}
				bottom={pillBottom}
				hidden={!focused}
				onPick={(share) => {
					actions.resumed();
					toY(share * maxScroll);
				}}
				y={y}
			/>
			<BackToTop
				bottom={pillBottom}
				endAt={endAt}
				hidden={!focused}
				onPress={toTop}
				y={y}
			/>
			<AudioDock bottom={insets.bottom} />
		</View>
	);
}
