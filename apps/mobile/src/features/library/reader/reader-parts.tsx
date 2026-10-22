import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { EnrichedMarkdownText, type MarkdownStyle } from 'react-native-enriched-markdown';
import Animated from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { AppText } from '@/src/components/shared/app-text';
import { CoverImage } from '@/src/features/library/cover-image';
import { cn } from '@/src/lib/utils';
import { COVER_BUTTON, CoverGlass } from '@/src/features/library/reader/cover-glass';
import { COVER_SCRIM } from '@/src/features/library/reader/cover-palette';
import { headerCredit, metaLabel, metaLine, prepareBody } from '@/src/features/library/reader/reader-copy';
import type { ReaderEntry } from '@/src/features/library/reader/reader-screen';
import { logDropped, useRecord } from '@/src/features/library/reader/use-read-signals';

const BACK_ICON = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as const;
const AA_ICON = { ios: 'textformat.size', android: 'text_fields', web: 'text_fields' } as const;
export const SAVE_ICON = { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' } as const;
export const SAVED_ICON = { ios: 'bookmark.fill', android: 'bookmark_added', web: 'bookmark_added' } as const;
const SOURCE_ICON = { ios: 'building.columns', android: 'account_balance', web: 'account_balance' } as const;
const XOLACE_LOGO = require('@/assets/images/icon.png');
// Callouts arrive as quotes led by their kind in bold (`prepareBody`), so the kind is read first.
const A11Y_LABELS = { blockquote: { quote: 'Quote' } };

// A share link opens the reader with nothing under it.
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(protected)'));

/** Round back control; on the cover photo it takes the fixed cover ink. */
export function BackButton({ onCover = false }: { onCover?: boolean }) {
  const coverInk = String(useCSSVariable('--color-cover-ink'));
  const foreground = useThemeColor('foreground');
  const icon = <SymbolView name={BACK_ICON} size={17} weight="semibold" tintColor={onCover ? coverInk : foreground} />;
  return (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      className={onCover ? COVER_BUTTON : 'h-10 w-10 items-center justify-center rounded-full bg-surface-secondary active:opacity-60'}
    >
      {onCover ? <CoverGlass>{icon}</CoverGlass> : icon}
    </Pressable>
  );
}

/** Opens the Aa sheet. Sits on the cover photo, so it takes the fixed cover ink. */
export function AaButton({ onPress }: { onPress: () => void }) {
  const coverInk = String(useCSSVariable('--color-cover-ink'));
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Reading appearance"
      className={COVER_BUTTON}
    >
      <CoverGlass>
        <SymbolView name={AA_ICON} size={17} weight="semibold" tintColor={coverInk} />
      </CoverGlass>
    </Pressable>
  );
}

/**
 * "I want this back" (#410): a plain toggle on the entry, same on the cards
 * and in the reader. On a cover photo it takes the fixed cover ink.
 */
/**
 * Cards' `saved` comes from list queries the optimistic update can't reach:
 * hold the tapped value until the server answers, and take no second toggle.
 * One per row, shared by every control that flips it (button, context menu).
 */
export function useSaveToggle(entryId: ReaderEntry['_id'], saved: boolean) {
  const record = useRecord();
  const [pending, setPending] = useState<boolean | null>(null);
  const shown = pending ?? saved;
  const toggle = () => {
    if (pending !== null) return;
    setPending(!shown);
    record({ entryId, saved: !shown })
      .catch(logDropped)
      .finally(() => setPending(null));
  };
  return { shown, pending, toggle };
}

export function SaveButton({ save, onCover = false }: { save: ReturnType<typeof useSaveToggle>; onCover?: boolean }) {
  const { shown, pending, toggle } = save;
  const coverInk = String(useCSSVariable('--color-cover-ink'));
  const foreground = useThemeColor('foreground');
  const icon = <SymbolView name={shown ? SAVED_ICON : SAVE_ICON} size={17} weight="semibold" tintColor={onCover ? coverInk : foreground} />;
  return (
    <Pressable
      disabled={pending !== null}
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Save"
      accessibilityState={{ selected: shown }}
      className={onCover ? COVER_BUTTON : 'h-10 w-10 items-center justify-center rounded-full active:opacity-60'}
    >
      {onCover ? <CoverGlass>{icon}</CoverGlass> : icon}
    </Pressable>
  );
}

/**
 * The entry's title and meta line — on the cover photo, or at the top of the
 * sheet at accessibility text sizes. First thing a screen reader lands on
 * (#400); focus never jumps to the resume point on its own, it's an action.
 */
export function ReaderTitle({
  entry,
  onCover,
  onBackToTop,
  onResume,
}: {
  entry: ReaderEntry;
  onCover: boolean;
  onBackToTop: () => void;
  /** Only when there's a place to resume. */
  onResume?: () => void;
}) {
  return (
    <>
      <AppText
        accessibilityRole="header"
        accessibilityActions={[
          { name: 'backToTop', label: 'Back to top' },
          ...(onResume ? [{ name: 'resume', label: 'Resume where you left off' }] : []),
        ]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'resume' ? onResume?.() : onBackToTop())}
        className={cn('font-bold text-[32px] leading-[38px]', onCover ? 'text-cover-ink' : 'text-foreground')}
      >
        {entry.title}
      </AppText>
      <AppText accessibilityLabel={metaLabel(entry)} className={cn('mt-2 text-sm', onCover ? 'text-cover-ink/80' : 'text-muted')}>
        {metaLine(entry.kind, entry.readMin, entry.storyDescriptor, entry.listenMin)}
      </AppText>
    </>
  );
}

/**
 * Who wrote it and how it reached this page, keyed on `reuse`. Every entry
 * shows it (#383); `aside` sits at its trailing edge (the Listen pill, #411).
 */
export function SourceCredit({ entry, aside }: { entry: Pick<ReaderEntry, 'reuse' | 'sources'>; aside?: ReactNode }) {
  const muted = useThemeColor('muted');
  const { name, line, href, logoUrl, xolace } = headerCredit(entry);

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        disabled={!href}
        onPress={() => href && Linking.openURL(href)}
        accessibilityRole={href ? 'link' : undefined}
        accessibilityLabel={`${name}, ${line}`}
        accessibilityHint={href ? 'Opens the original' : undefined}
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-secondary">
          {xolace || logoUrl ? (
            <Image source={xolace ? XOLACE_LOGO : { uri: logoUrl }} style={{ width: 36, height: 36 }} contentFit="cover" />
          ) : (
            <SymbolView name={SOURCE_ICON} size={15} tintColor={muted} />
          )}
        </View>
        <View className="flex-1">
          <AppText className="font-semibold text-sm">{name}</AppText>
          <AppText className="text-xs text-muted">{line}</AppText>
        </View>
      </Pressable>
      {aside}
    </View>
  );
}

/** The cover photo under its scrim; the reader draws it twice (behind the scroller, in the bar). */
export function CoverPhoto({
  uri,
  thumbhash,
  style,
}: {
  uri?: string;
  thumbhash?: string;
  style: ComponentProps<typeof Animated.View>['style'];
}) {
  return (
    <Animated.View style={style} className="bg-cover-scrim">
      {/* ponytail: no cover → the plain scrim; the subject's cover lands when subjects get art */}
      <CoverImage uri={uri} thumbhash={thumbhash} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={COVER_SCRIM.colors} locations={COVER_SCRIM.locations} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** The entry body. The renderer handles headings, links, alt text, lists and quotes for screen readers. */
export function ReaderBody({ markdown, style }: { markdown: string; style: MarkdownStyle }) {
  return (
    <EnrichedMarkdownText
      flavor="github"
      markdown={prepareBody(markdown)}
      markdownStyle={style}
      onLinkPress={({ url }) => Linking.openURL(url)}
      accessibilityLabels={A11Y_LABELS}
    />
  );
}
