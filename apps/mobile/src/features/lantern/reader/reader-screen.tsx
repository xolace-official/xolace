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
import { useScrollMoments } from "@/features/lantern/reader/reader-scroll";
import { READING_MODES } from "@/features/lantern/reader/reading-modes";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { columnPad, useScreen } from "@/lib/wide-layout";

const PILL_GAP = 16;
/** The page's side padding (`px-6`): on wide screens it grows to hold the text to a reading column. */
const PAGE_PAD = 24;
const SHEET_BOTTOM = 96;

export function ReaderScreen({ startAt }: { startAt?: number }) {
	const { mode } = useReaderScreen().state.prefs;
	return (
		<ReaderPageScope page={READING_MODES[mode].page}>
			<ReaderView startAt={startAt} />
		</ReaderPageScope>
	);
}

function ReaderView({ startAt }: { startAt?: number }) {
	const { state, actions } = useReaderScreen();
	const insets = useSafeAreaInsets();
	const focused = useIsFocused();
	const reduced = useEffectiveReducedMotion();
	const page = useTokenColor("background");
	const padX = columnPad(useScreen(), PAGE_PAD);
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

	useScrollMoments({
		endAt,
		maxScroll,
		opensAt: resumeOnOpen(state.opensAt, position),
		scroll,
		startAt,
		y,
	});

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
			<Stack.Screen options={{ gestureEnabled: focused }} />
			{focused ? <StatusBar style="light" /> : null}
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
					className="justify-end pb-12"
					pointerEvents="none"
					style={[
						{ height: f.coverH - FOLD.sheetOverlap, paddingHorizontal: padX },
						styles.largeTitle,
					]}
				>
					{f.ax ? null : title}
				</Animated.View>
				<View
					className="rounded-t-[28px] pt-6"
					pointerEvents={focused ? "auto" : "none"}
					style={{
						backgroundColor: page,
						borderCurve: "continuous",
						minHeight: f.screenH,
						paddingBottom: insets.bottom + dockH + SHEET_BOTTOM,
						paddingHorizontal: padX,
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
			<AudioDock bottom={insets.bottom} inert={!focused} />
			<FireDim />
		</View>
	);
}
