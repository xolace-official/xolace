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
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/shared/app-text';
import { AX_FONT_SCALE } from '@/src/features/library/home/entry-cards';
import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';
import { useAppStore } from '@/src/store/store';
import { AaSheet } from './aa-sheet';
import { AudioDock, BAR_MAX_SCALE, ListenPill } from './audio-dock';
import { BackToTop } from './back-to-top';
import { EndOfRead } from './end-of-read';
import { ContentNote, FireDim, HelplineLink, ReflectOnThis, ShareButton } from './reader-extras';
import { ReaderPageScope } from './reader-page';
import { AaButton, BackButton, CoverPhoto, ReaderBody, ReaderTitle, SaveButton, SourceCredit } from './reader-parts';
import { READING_MODES, useReadingFonts } from './reading-mode';
import { EntryCredits } from './entry-credits';
import { useEntryAudio } from './use-entry-audio';
import { useReadSignals } from './use-read-signals';
import { useMarkdownStyle } from './use-markdown-style';

export type ReaderEntry = NonNullable<FunctionReturnType<typeof api.library.entries.getEntry>>;

const SHEET_OVERLAP = 28;
const BAR_ROW = 52;
// At accessibility text sizes the cover is a band.
const COVER_BAND = 72;

/** The reader on its reading mode's page (#408); the Aa sheet sits outside it, on the app theme. */
export function ReaderScreen({ entry }: { entry: ReaderEntry }) {
  const mode = useAppStore((s) => s.readingMode);
  const [aaOpen, setAaOpen] = useState(false);
  return (
    <>
      <ReaderPageScope page={READING_MODES[mode].page}>
        <ReaderView entry={entry} onOpenAa={() => setAaOpen(true)} />
      </ReaderPageScope>
      <AaSheet isOpen={aaOpen} onClose={() => setAaOpen(false)} />
    </>
  );
}

function ReaderView({ entry, onOpenAa }: { entry: ReaderEntry; onOpenAa: () => void }) {
  const insets = useSafeAreaInsets();
  const { height: screenH, width, fontScale } = useWindowDimensions();
  const reduced = useEffectiveReducedMotion();
  const ax = fontScale >= AX_FONT_SCALE;
  const mode = useAppStore((s) => s.readingMode);
  const textSize = useAppStore((s) => s.readerTextSize);
  const markdownStyle = useMarkdownStyle(mode, textSize, useReadingFonts());
  // The page from the hook, not `bg-background`: the class doesn't pick up the
  // scoped page on this screen (#401 prototype finding).
  const page = useThemeColor('background');
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
      ? Math.min(coverH - SHEET_OVERLAP + articleEnd - viewH + insets.bottom + audio.dockH, maxScroll - 40)
      : Number.POSITIVE_INFINITY;
  const signals = useReadSignals({ entryId: entry._id, slug: entry.slug, readMin: entry.readMin, scrollY: y, scrollRef, maxScroll, endAt });
  const toTop = () => scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
  const resumeAt = signals?.position ? signals.position * maxScroll : 0;
  const title = (
    <ReaderTitle
      entry={entry}
      onCover={!ax}
      onBackToTop={toTop}
      onResume={resumeAt > 0 ? () => scrollRef.current?.scrollTo({ y: resumeAt, animated: !reduced }) : undefined}
    />
  );

  // Both copies of the photo. Pulled down, it grows from its top edge.
  const photo = useAnimatedStyle(() => {
    const v = y.get();
    if (v < 0) return reduced ? {} : { transform: [{ scale: 1 - v / coverH }], transformOrigin: 'top' };
    return { transform: [{ translateY: -Math.min(v * drift, imageStop) }] };
  });
  const largeTitle = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, fold * 0.7], [1, 0], 'clamp'),
  }));
  const barShade = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [fold - 60, fold], [0, 1], 'clamp'),
  }));
  const barTitle = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [fold - 10, fold + 30], [0, 1], 'clamp'),
    transform: [{ translateY: reduced ? 0 : interpolate(y.get(), [fold - 10, fold + 30], [6, 0], 'clamp') }],
  }));
  const readBar = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.min(Math.max((y.get() - fold) / Math.max(contentH - viewH - fold, 1), 0), 1) }],
    opacity: y.get() > fold ? 1 : 0,
  }));

  // One element, drawn twice: behind the scroller and inside the bar window.
  const photoEl = <CoverPhoto uri={entry.coverUrl} thumbhash={entry.coverThumbhash} style={[{ width, height: coverH }, photo]} />;

  return (
    <View className="flex-1" style={{ backgroundColor: page }} onLayout={(e) => setViewH(e.nativeEvent.layout.height)}>
      {/* Decorative: the cover is hidden from screen readers (#400). */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {photoEl}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, h) => setContentH(h)}
      >
        <Animated.View
          pointerEvents="none"
          className="justify-end px-6 pb-12"
          style={[{ height: coverH - SHEET_OVERLAP }, largeTitle]}
        >
          {!ax && title}
        </Animated.View>

        <View
          className="rounded-t-[28px] px-6 pt-6"
          style={{ backgroundColor: page, borderCurve: 'continuous', minHeight: screenH, paddingBottom: insets.bottom + audio.dockH + 96 }}
        >
          {ax && <View className="mb-6">{title}</View>}
          <View className="mb-6">
            <SourceCredit entry={entry} aside={entry.listenMin && <ListenPill audio={audio} listenMin={entry.listenMin} />} />
          </View>
          {entry.contentNote && <ContentNote note={entry.contentNote} />}
          <ReaderBody markdown={entry.markdown} style={markdownStyle} />
          {/* Attribution straight after the body, before the end of the read (#400). */}
          <EntryCredits entry={entry} onLayout={(e) => setArticleEnd(e.nativeEvent.layout.y + e.nativeEvent.layout.height)} />
          {signals && <EndOfRead entry={entry} signals={signals} />}
          <ReflectOnThis entry={entry} />
          <HelplineLink kind={entry.kind} />
        </View>
      </Animated.ScrollView>

      {/* The bar window: same photo, same offset, clipped to the bar. Decorative. */}
      <View pointerEvents="none" className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: barH }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {photoEl}
        <Animated.View style={[StyleSheet.absoluteFill, barShade]} className="bg-cover-scrim/35" />
        {/* Reading progress hairline. */}
        <Animated.View style={[{ height: 2, transformOrigin: 'left' }, readBar]} className="absolute inset-x-0 bottom-0 bg-cover-ink/80" />
      </View>
      {/* The controls sit outside the clip so a pressed glass button can swell past the bar's edge. */}
      <View pointerEvents="box-none" className="absolute inset-x-0 top-0 flex-row items-center gap-3 px-4 pb-0.5" style={{ height: barH, paddingTop: insets.top }}>
        <BackButton onCover />
        {/* A visual echo of the title: screen readers already have the heading. */}
        <Animated.View className="flex-1" style={barTitle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <AppText numberOfLines={1} maxFontSizeMultiplier={BAR_MAX_SCALE} className="font-semibold text-cover-ink">
            {entry.title}
          </AppText>
        </Animated.View>
        {signals && <SaveButton entryId={entry._id} saved={signals.saved} onCover />}
        <ShareButton entry={entry} />
        <AaButton onPress={onOpenAa} />
      </View>

      <FireDim />
      <BackToTop
        scrollY={y}
        endAt={endAt}
        bottom={insets.bottom + audio.dockH + 16}
        onPress={toTop}
      />
      <AudioDock audio={audio} entryId={entry._id} title={audio.track?.title || entry.title} coverUrl={entry.coverUrl} bottom={insets.bottom} />
    </View>
  );
}
