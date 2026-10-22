/**
 * What follows the body (#469): an adapted entry's "View sources" row and the
 * sheet it opens; verbatim and original entries keep their licence lines.
 * The sheet sits on the reading mode's page, like the reader under it.
 */
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { BottomSheet, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Linking, Pressable, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

import { BottomSheetBlurOverlay } from '@/src/components/bottom-sheet-blur-overlay';
import { AppText } from '@/src/components/shared/app-text';
import { useAppStore } from '@/src/store/store';
import { attributionLines } from './reader-copy';
import { CHEVRON } from './reader-extras';
import { ReaderPageScope } from './reader-page';
import type { ReaderEntry } from './reader-screen';
import { READING_MODES } from './reading-mode';

const SOURCES_ICON = { ios: 'books.vertical', android: 'menu_book', web: 'menu_book' } as const;
const LINK_ICON = { ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' } as const;

type Source = ReaderEntry['sources'][number];

/** Straight after the body; `onLayout` marks the end of the article for the read signals. */
export function EntryCredits({ entry, onLayout }: { entry: Pick<ReaderEntry, 'reuse' | 'sources'>; onLayout: (e: LayoutChangeEvent) => void }) {
  const [open, setOpen] = useState(false);
  const muted = useThemeColor('muted');
  if (entry.reuse !== 'adapted') {
    return (
      <AppText className="mt-8 border-t border-separator pt-4 text-xs text-muted" onLayout={onLayout}>
        {attributionLines(entry.sources).join('\n')}
      </AppText>
    );
  }
  const count = entry.sources.length;
  return (
    <View className="mt-8 border-t border-separator pt-2" onLayout={onLayout}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="View sources"
        accessibilityHint={`Lists the ${count} ${count === 1 ? 'source' : 'sources'} this was adapted from`}
        className="flex-row items-center gap-3 py-3 active:opacity-60"
      >
        <SymbolView name={SOURCES_ICON} size={17} tintColor={muted} />
        <AppText className="flex-1 font-semibold text-sm">View sources</AppText>
        <SymbolView name={CHEVRON} size={13} weight="semibold" tintColor={muted} />
      </Pressable>
      <SourcesSheet sources={entry.sources} isOpen={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function SourcesSheet({ sources, isOpen, onClose }: { sources: Source[]; isOpen: boolean; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const page = READING_MODES[useAppStore((s) => s.readingMode)].page;
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      {/* Modal container: VoiceOver stays in the sheet instead of reaching the reader behind it. */}
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        {/* Inside the portal: the scope is context, and the portal leaves the reader's tree. */}
        <ReaderPageScope page={page}>
          <BottomSheetBlurOverlay />
          <BottomSheet.Content
            // gorhom makes the sheet one accessible element, which hides its rows and links.
            accessible={false}
            enableDynamicSizing
            backgroundClassName="bg-background"
            handleIndicatorClassName="bg-foreground/20"
          >
            {/* Header inside the scroller: dynamic sizing measures only the scroller's content. */}
            <BottomSheetScrollView style={{ maxHeight: height * 0.7 }} contentContainerStyle={{ paddingBottom: 48 }}>
              <View className="px-6 pb-4 pt-2">
                <AppText accessibilityRole="header" className="font-bold text-lg text-foreground">
                  Sources adapted from
                </AppText>
                <AppText className="text-sm text-muted">For further reading</AppText>
              </View>
              {sources.map((s, i) => (
                <SourceRow key={i} source={s} />
              ))}
              {/* Each publisher's licence once, however many of its pages are cited. */}
              <AppText className="mx-6 mt-4 border-t border-separator pt-4 text-xs text-muted">
                {attributionLines(sources).join('\n')}
              </AppText>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </ReaderPageScope>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/** publisher – page title · author; the title opens the page when there is one. */
function SourceRow({ source: s }: { source: Source }) {
  const href = s.pageUrl;
  const muted = useThemeColor('muted');
  return (
    <Pressable
      disabled={!href}
      // A failed open leaves the list as it was: the credit never depends on the network.
      onPress={() => href && Linking.openURL(href).catch(() => {})}
      accessibilityRole={href ? 'link' : 'text'}
      accessibilityLabel={[s.pageTitle, `from ${s.name}`, s.author && `by ${s.author}`].filter(Boolean).join(', ')}
      accessibilityHint={href ? 'Opens the original page' : undefined}
      className="flex-row items-center gap-3 px-6 py-3 active:opacity-60"
    >
      <AppText className="flex-1 text-sm text-foreground">
        <AppText className="font-semibold text-sm text-foreground">{s.name}</AppText>
        {' – '}
        <AppText className={href ? 'text-sm text-foreground underline' : 'text-sm text-foreground'}>{s.pageTitle}</AppText>
        {s.author && <AppText className="text-sm text-muted">{` · ${s.author}`}</AppText>}
      </AppText>
      {href && <SymbolView name={LINK_ICON} size={13} weight="semibold" tintColor={muted} />}
    </Pressable>
  );
}
