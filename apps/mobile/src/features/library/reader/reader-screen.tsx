/**
 * The Lantern reader (#407): the one screen an entry opens in. Built from the
 * "cover fold" variant chosen in #395.
 *
 * A full-bleed parallax cover with the title on the photo. Scrolling, the
 * rounded body sheet rides up over the cover and folds under a pinned bar
 * that shows a slice of the same photo, where the compact title lands.
 * Transform and opacity only: nothing here changes layout per frame.
 *
 * Layers, back to front: photo → scroller (title in its clear top region,
 * then the sheet) → bar window (a clipped copy of the photo at the same
 * offset, invisible until the sheet slides under it) → back to top.
 */
import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Link, router, Stack } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	interpolate,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/shared/app-text";
import { AX_FONT_SCALE } from "@/features/library/home/entry-cards";
import {
	AudioDock,
	BAR_MAX_SCALE,
	ListenPill,
} from "@/features/library/reader/audio-dock";
import { BackToTop } from "@/features/library/reader/back-to-top";
import { EndOfRead } from "@/features/library/reader/end-of-read";
import { EntryCredits } from "@/features/library/reader/entry-credits";
import {
	ContentNote,
	FireDim,
	HelplineLink,
	ReflectOnThis,
	ShareButton,
} from "@/features/library/reader/reader-extras";
import { ReaderPageScope } from "@/features/library/reader/reader-page";
import {
	AaButton,
	BackButton,
	CoverPhoto,
	ReaderBody,
	ReaderTitle,
	SaveButton,
	SourceCredit,
	useSaveToggle,
} from "@/features/library/reader/reader-parts";
import {
	READING_MODES,
	useReadingFonts,
} from "@/features/library/reader/reading-mode";
import { useEntryAudio } from "@/features/library/reader/use-entry-audio";
import { useMarkdownStyle } from "@/features/library/reader/use-markdown-style";
import { useReadSignals } from "@/features/library/reader/use-read-signals";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";

export type ReaderEntry = NonNullable<
	FunctionReturnType<typeof api.library.entries.getEntry>
>;

const SHEET_OVERLAP = 28;
const BAR_ROW = 52;
// At accessibility text sizes the cover is a band.
const COVER_BAND = 72;

/** The reader on its reading mode's page (#408); the Aa sheet sits outside it, on the app theme. */
export function ReaderScreen({ entry }: { entry: ReaderEntry }) {
	const mode = useAppStore((s) => s.readingMode);
	return (
		<ReaderPageScope page={READING_MODES[mode].page}>
			<ReaderView
				entry={entry}
				onOpenAa={() => router.navigate("/reader-appearance")}
			/>
		</ReaderPageScope>
	);
}

function ReaderView({
	entry,
	onOpenAa,
}: {
	entry: ReaderEntry;
	onOpenAa: () => void;
}) {
	const insets = useSafeAreaInsets();
	// The Aa sheet leaves the reader undimmed and touchable (its detent setting);
	// the bar's buttons and the pull-down dismiss go inert while it is up so the
	// reader can't close under it.
	const focused = useIsFocused();
	const { height: screenH, width, fontScale } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const ax = fontScale >= AX_FONT_SCALE;
	const mode = useAppStore((s) => s.readingMode);
	const textSize = useAppStore((s) => s.readerTextSize);
	const markdownStyle = useMarkdownStyle(mode, textSize, useReadingFonts());
	// The page from the hook, not `bg-background`: the class doesn't pick up the
	// scoped page on this screen (#401 prototype finding).
	const page = useThemeColor("background");
	const barH = insets.top + BAR_ROW;
	// At accessibility sizes the photo shrinks to a band and the title moves onto the page.
	const coverH = ax ? barH + COVER_BAND : Math.round(screenH * 0.52);
	const fold = coverH - SHEET_OVERLAP - barH; // scroll at which the sheet meets the bar
	const imageStop = (coverH - barH) / 2; // parallax travel before the photo pins
	const drift = reduced ? 1 : 0.5; // reduced motion: the photo just scrolls, no parallax
	const audio = useEntryAudio(entry._id, entry.slug, !!entry.listenMin); // #411

	const [contentH, setContentH] = useState(1);
	const [viewH, setViewH] = useState(1);
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const y = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => y.set(e.contentOffset.y));
	const [articleEnd, setArticleEnd] = useState(0); // bottom of the attribution, in sheet coordinates
	const maxScroll = contentH - viewH;
	// The end is the article's last line clearing the dock, not the page bottom:
	// Up next, Reflect on this and the helpline sit below it.
	const endAt =
		maxScroll > 0 && articleEnd > 0
			? Math.min(
					coverH -
						SHEET_OVERLAP +
						articleEnd -
						viewH +
						insets.bottom +
						audio.dockH,
					maxScroll - 40
				)
			: Number.POSITIVE_INFINITY;
	const signals = useReadSignals({
		endAt,
		entryId: entry._id,
		maxScroll,
		readMin: entry.readMin,
		scrollRef,
		scrollY: y,
		slug: entry.slug,
	});
	const toTop = () => scrollRef.current?.scrollTo({ animated: !reduced, y: 0 });
	const resumeAt = signals?.position ? signals.position * maxScroll : 0;
	const save = useSaveToggle(entry._id, signals?.saved ?? false);
	const title = (
		<ReaderTitle
			entry={entry}
			onBackToTop={toTop}
			onCover={!ax}
			onResume={
				resumeAt > 0
					? () =>
							scrollRef.current?.scrollTo({ animated: !reduced, y: resumeAt })
					: undefined
			}
		/>
	);

	// Both copies of the photo. Pulled down, it grows from its top edge.
	const photo = useAnimatedStyle(() => {
		const v = y.get();
		if (v < 0) {
			return reduced
				? {}
				: { transform: [{ scale: 1 - v / coverH }], transformOrigin: "top" };
		}
		return { transform: [{ translateY: -Math.min(v * drift, imageStop) }] };
	});
	const largeTitle = useAnimatedStyle(() => ({
		opacity: interpolate(y.get(), [0, fold * 0.7], [1, 0], "clamp"),
	}));
	const barShade = useAnimatedStyle(() => ({
		opacity: interpolate(y.get(), [fold - 60, fold], [0, 1], "clamp"),
	}));
	const barTitle = useAnimatedStyle(() => ({
		opacity: interpolate(y.get(), [fold - 10, fold + 30], [0, 1], "clamp"),
		transform: [
			{
				translateY: reduced
					? 0
					: interpolate(y.get(), [fold - 10, fold + 30], [6, 0], "clamp"),
			},
		],
	}));
	const readBar = useAnimatedStyle(() => ({
		opacity: y.get() > fold ? 1 : 0,
		transform: [
			{
				scaleX: Math.min(
					Math.max((y.get() - fold) / Math.max(contentH - viewH - fold, 1), 0),
					1
				),
			},
		],
	}));

	// One element, drawn twice: behind the scroller and inside the bar window.
	const photoEl = (
		<CoverPhoto
			style={[{ height: coverH, width }, photo]}
			thumbhash={entry.coverThumbhash}
			uri={entry.coverUrl}
		/>
	);

	return (
		<View
			className="flex-1"
			onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
			style={{ backgroundColor: page }}
		>
			<Stack.Screen options={{ gestureEnabled: focused }} />
			{/* Decorative: the cover is hidden from screen readers (#400). Cover-sized so a photo card zooms into the photo. */}
			<Link.AppleZoomTarget>
				<View
					accessibilityElementsHidden
					className="absolute inset-x-0 top-0"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={{ height: coverH }}
				>
					{photoEl}
				</View>
			</Link.AppleZoomTarget>

			<Animated.ScrollView
				onContentSizeChange={(_, h) => setContentH(h)}
				onScroll={onScroll}
				ref={scrollRef}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				<Animated.View
					className="justify-end px-6 pb-12"
					pointerEvents="none"
					style={[{ height: coverH - SHEET_OVERLAP }, largeTitle]}
				>
					{!ax && title}
				</Animated.View>

				<View
					className="rounded-t-[28px] px-6 pt-6"
					style={{
						backgroundColor: page,
						borderCurve: "continuous",
						minHeight: screenH,
						paddingBottom: insets.bottom + audio.dockH + 96,
					}}
				>
					{ax && <View className="mb-6">{title}</View>}
					<View className="mb-6">
						<SourceCredit
							aside={
								entry.listenMin && (
									<ListenPill audio={audio} listenMin={entry.listenMin} />
								)
							}
							entry={entry}
						/>
					</View>
					{entry.contentNote && <ContentNote note={entry.contentNote} />}
					<ReaderBody markdown={entry.markdown} style={markdownStyle} />
					{/* Attribution straight after the body, before the end of the read (#400). */}
					<EntryCredits
						entry={entry}
						onLayout={(e) =>
							setArticleEnd(
								e.nativeEvent.layout.y + e.nativeEvent.layout.height
							)
						}
					/>
					{signals && <EndOfRead entry={entry} signals={signals} />}
					<ReflectOnThis entry={entry} />
					<HelplineLink kind={entry.kind} />
				</View>
			</Animated.ScrollView>

			{/* The bar window: same photo, same offset, clipped to the bar. Decorative. */}
			<View
				accessibilityElementsHidden
				className="absolute inset-x-0 top-0 overflow-hidden"
				importantForAccessibility="no-hide-descendants"
				pointerEvents="none"
				style={{ height: barH }}
			>
				{photoEl}
				<Animated.View
					className="bg-cover-scrim/35"
					style={[StyleSheet.absoluteFill, barShade]}
				/>
				{/* Reading progress hairline. */}
				<Animated.View
					className="absolute inset-x-0 bottom-0 bg-cover-ink/80"
					style={[{ height: 2, transformOrigin: "left" }, readBar]}
				/>
			</View>
			{/* The controls sit outside the clip so a pressed glass button can swell past the bar's edge. */}
			<View
				className="absolute inset-x-0 top-0 flex-row items-center gap-3 px-4 pb-0.5"
				pointerEvents={focused ? "box-none" : "none"}
				style={{ height: barH, paddingTop: insets.top }}
			>
				<BackButton onCover />
				{/* A visual echo of the title: screen readers already have the heading. */}
				<Animated.View
					accessibilityElementsHidden
					className="flex-1"
					importantForAccessibility="no-hide-descendants"
					style={barTitle}
				>
					<AppText
						className="font-semibold text-cover-ink"
						maxFontSizeMultiplier={BAR_MAX_SCALE}
						numberOfLines={1}
					>
						{entry.title}
					</AppText>
				</Animated.View>
				{signals && <SaveButton onCover save={save} />}
				<ShareButton entry={entry} />
				<AaButton onPress={onOpenAa} />
			</View>

			<FireDim />
			<BackToTop
				bottom={insets.bottom + audio.dockH + 16}
				endAt={endAt}
				onPress={toTop}
				scrollY={y}
			/>
			<AudioDock
				audio={audio}
				bottom={insets.bottom}
				coverUrl={entry.coverUrl}
				entryId={entry._id}
				title={audio.track?.title || entry.title}
			/>
		</View>
	);
}
