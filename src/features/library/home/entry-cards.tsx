/**
 * The Lantern home's atoms (#409, from #396 variant A): the photo card, the
 * thumbnail row and the section title. Every entry tap opens the one reader,
 * `library/[slug]` (#407).
 */
import type { FunctionReturnType } from 'convex/server';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { usePostHog } from 'posthog-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import type { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { cn } from '@/src/lib/utils';
import { CoverImage } from '@/src/features/library/cover-image';
import { facetLabel, readTimeLine } from '@/src/features/library/home/library-copy';
import { COVER_SCRIM } from '@/src/features/library/reader/cover-palette';
import { capitalise } from '@/src/features/library/reader/reader-copy';
import { SAVE_ICON, SAVED_ICON, SaveButton, useSaveToggle } from '@/src/features/library/reader/reader-parts';
import { SHARE_ICON, shareEntry } from '@/src/features/library/reader/reader-extras';
import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';
import type { ReaderFrom } from '@/src/features/library/analytics';

export type EntryItem = FunctionReturnType<typeof api.library.entries.listEntries>[number];

/** Photo cards' corner, shared with the For you blur that sits over them. */
export const CARD_RADIUS = 28;
// iOS's first accessibility text size (AX1) is ~1.65×; at these titles go uncapped.
export const AX_FONT_SCALE = 1.6;

/** `hub` rides along from a hub so the reader's Up next follows its order (#417). */
export const readerHref = (slug: string, from: ReaderFrom, hub?: string) =>
  ({ pathname: '/library/[slug]', params: { slug, from, ...(hub && { hub }) } }) as const;

/**
 * Full-bleed cover photo, kicker, title, meta, and a play mark when the entry
 * has audio. Ink is the reader cover's fixed palette. At accessibility text
 * sizes the title is uncapped and the card grows to fit (#400).
 */
export function PhotoCard({
  entry,
  kicker,
  width,
  height,
  href = readerHref(entry.slug, 'home'),
  meta = readTimeLine(entry.readMin, entry.views),
  label = `${entry.title}. ${kicker}. ${meta}`,
}: {
  entry: Omit<EntryItem, 'views' | 'saved'> & { views?: number };
  kicker: string;
  width: number;
  height: number;
  href?: ReturnType<typeof readerHref>;
  meta?: string;
  label?: string;
}) {
  const ax = useWindowDimensions().fontScale >= AX_FONT_SCALE;
  const reduced = useEffectiveReducedMotion();
  const posthog = usePostHog();
  return (
    <View style={{ width, minHeight: height }}>
      <Link href={href} asChild>
        <Link.Trigger withAppleZoom={!reduced}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={label}
            className="overflow-hidden bg-cover-scrim active:opacity-90"
            style={{
              width,
              minHeight: height,
              borderRadius: CARD_RADIUS,
              borderCurve: 'continuous',
            }}
          >
            <CoverImage uri={entry.coverUrl} thumbhash={entry.coverThumbhash} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <LinearGradient
              colors={COVER_SCRIM.colors}
              locations={COVER_SCRIM.locations}
              style={StyleSheet.absoluteFill}
            />
            <View className="flex-1 justify-end gap-2 p-5">
              <AppText className="text-[12px] font-medium uppercase tracking-[1.5px] text-cover-ink/70">{kicker}</AppText>
              <AppText className="text-[24px] font-bold leading-[29px] text-cover-ink" numberOfLines={ax ? undefined : 3}>
                {entry.title}
              </AppText>
              <AppText className="text-[13px] text-cover-ink/75">{meta}</AppText>
            </View>
          </Pressable>
        </Link.Trigger>
        <Link.Preview />
        {/* No Save here: these entries don't carry `saved`. */}
        <Link.Menu>
          <Link.MenuAction icon={SHARE_ICON.ios} onPress={() => shareEntry(entry, posthog)}>
            Share
          </Link.MenuAction>
        </Link.Menu>
      </Link>
      {entry.listenMin !== undefined && <HasAudio />}
    </View>
  );
}

const PLAY = { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' } as const;

/** A mark, not a control: this entry has audio. Taps fall through to the card. */
function HasAudio() {
  const coverInk = String(useCSSVariable('--color-cover-ink'));
  const glass = isLiquidGlassAvailable();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full', !glass && 'bg-cover-scrim/30')}
    >
      {/* Over the photo, a fixed palette: dark clear glass, not the themed GlassSurface. */}
      {glass && <GlassView glassEffectStyle="clear" colorScheme="dark" style={BADGE_GLASS} />}
      <SymbolView name={PLAY} size={15} weight="semibold" tintColor={coverInk} />
    </View>
  );
}

const BADGE_GLASS = { position: 'absolute', inset: 0, borderRadius: 20 } as const;

/** Thumbnail left, "Kind · Subject" kicker, bold title, meta. */
export function EntryRow({
  entry,
  index,
  from,
  hub,
}: {
  entry: EntryItem;
  index?: number;
  from: ReaderFrom;
  hub?: string;
}) {
  const save = useSaveToggle(entry._id, entry.saved);
  const posthog = usePostHog();
  return (
    <View className="flex-row items-center pr-4">
      <Link href={readerHref(entry.slug, from, hub)} asChild>
        {/* No zoom: the thumb is too small to grow from. */}
        <Link.Trigger>
          <Pressable accessibilityRole="link" className="flex-1 flex-row items-center gap-4 py-3 pl-4 active:opacity-70">
            {index !== undefined && <AppText className="w-4 text-[13px] text-muted">{index + 1}</AppText>}
            <View className="overflow-hidden rounded-[14px] bg-surface-secondary" style={THUMB}>
              <CoverImage uri={entry.coverThumbUrl ?? entry.coverUrl} thumbhash={entry.coverThumbhash} style={THUMB} transition={200} />
            </View>
            <View className="flex-1 gap-1">
              <AppText className="text-[12px] text-muted">
                {capitalise(entry.kind)} · {facetLabel(entry.primarySubject)}
              </AppText>
              <AppText className="text-[16px] font-semibold leading-[21px]" numberOfLines={2}>
                {entry.title}
              </AppText>
              <AppText className="text-[13px] text-muted">{readTimeLine(entry.readMin, entry.views, entry.listenMin)}</AppText>
            </View>
          </Pressable>
        </Link.Trigger>
        <Link.Preview />
        <Link.Menu>
          <Link.MenuAction icon={save.shown ? SAVED_ICON.ios : SAVE_ICON.ios} onPress={save.toggle}>
            {save.shown ? 'Remove from saved' : 'Save'}
          </Link.MenuAction>
          <Link.MenuAction icon={SHARE_ICON.ios} onPress={() => shareEntry(entry, posthog)}>
            Share
          </Link.MenuAction>
        </Link.Menu>
      </Link>
      <SaveButton save={save} />
    </View>
  );
}

const THUMB = { width: 104, height: 78 };

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-end justify-between px-4 pb-3 pt-8">
      <AppText accessibilityRole="header" className="text-[22px] font-bold">
        {title}
      </AppText>
      {action && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText className="text-[15px] font-medium text-accent">{action}</AppText>
        </Pressable>
      )}
    </View>
  );
}
