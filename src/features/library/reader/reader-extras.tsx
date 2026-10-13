/**
 * The reader's small moves (#413, CONTEXT.md "Library: what reading can lead
 * to"): the content note, "Reflect on this", sharing, the helpline link and
 * the "Read by the fire" ambience.
 */
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { usePostHog, type PostHog } from 'posthog-react-native';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { AppText } from '@/src/components/shared/app-text';
import { trackLibrary } from '@/src/features/library/analytics';
import { detectCountry } from '@/src/features/crisis-resources/use-crisis-resources';
import { useAppStore } from '@/src/store/store';
import { COVER_BUTTON, CoverGlass } from '@/src/features/library/reader/cover-glass';
import { REFLECT_PROMPT, shareMessage } from '@/src/features/library/reader/reader-copy';
import type { ReaderEntry } from '@/src/features/library/reader/reader-screen';

const NOTE_ICON = { ios: 'exclamationmark.circle', android: 'info', web: 'info' } as const;
export const SHARE_ICON = { ios: 'square.and.arrow.up', android: 'share', web: 'share' } as const;
const HELP_ICON = { ios: 'phone', android: 'call', web: 'call' } as const;
export const CHEVRON = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;
const DAY_MS = 86_400_000;

/** A curator's heads-up, before the body begins. */
export function ContentNote({ note }: { note: string }) {
  const muted = useThemeColor('muted');
  return (
    <View
      accessible
      accessibilityLabel={`Content note: ${note}`}
      className="mb-6 flex-row gap-3 rounded-2xl bg-surface-secondary p-4"
      style={{ borderCurve: 'continuous' }}
    >
      <SymbolView name={NOTE_ICON} size={16} tintColor={muted} />
      <View className="flex-1 gap-1">
        <AppText className="text-xs font-semibold uppercase tracking-widest text-muted">Content note</AppText>
        <AppText className="text-sm">{note}</AppText>
      </View>
    </View>
  );
}

/** Leaves the entry for a reflect session that opens on its prompt; the session records the entry. */
export function ReflectOnThis({ entry }: { entry: Pick<ReaderEntry, '_id' | 'slug' | 'title' | 'reflectPrompt'> }) {
  const setPrompt = useAppStore((s) => s.setPendingEventPrompt);
  const posthog = usePostHog();
  const prompt = entry.reflectPrompt ?? REFLECT_PROMPT;
  return (
    <View className="mt-10 gap-4 rounded-3xl bg-surface p-5" style={{ borderCurve: 'continuous' }}>
      <AppText className="text-lg font-semibold">{prompt}</AppText>
      <Pressable
        onPress={() => {
          setPrompt({ text: prompt, label: entry.title, expiresAt: Date.now() + DAY_MS, fromEntryId: entry._id });
          trackLibrary(posthog, 'library_reflect_started', { slug: entry.slug, curated: !!entry.reflectPrompt });
          router.dismissTo('/');
        }}
        accessibilityRole="button"
        className="items-center rounded-full bg-accent py-3 active:opacity-70"
      >
        <AppText className="font-semibold text-accent-foreground">Reflect on this</AppText>
      </Pressable>
    </View>
  );
}

/** Standard share sheet with a deep link to the entry — the reader's button and the cards' menu. */
export async function shareEntry(entry: Pick<ReaderEntry, 'slug' | 'title'>, posthog: PostHog) {
  const url = Linking.createURL(`library/${entry.slug}`, { queryParams: { from: 'share' } });
  try {
    const { action } = await Share.share({ message: shareMessage(entry.title, url) });
    if (action === Share.sharedAction) trackLibrary(posthog, 'library_entry_shared', { slug: entry.slug });
  } catch {
    // The sheet failed to open; nothing was shared and there's nothing to undo.
  }
}

/** Shares the entry. Sits on the cover. */
export function ShareButton({ entry }: { entry: Pick<ReaderEntry, 'slug' | 'title'> }) {
  const coverInk = String(useCSSVariable('--color-cover-ink'));
  const posthog = usePostHog();
  return (
    <Pressable
      onPress={() => shareEntry(entry, posthog)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Share"
      className={COVER_BUTTON}
    >
      <CoverGlass>
        <SymbolView name={SHARE_ICON} size={17} weight="semibold" tintColor={coverInk} />
      </CoverGlass>
    </Pressable>
  );
}

/** Explainers end on a way to the crisis-resources screen — only where we have resources (#403). */
export function HelplineLink({ kind }: { kind: ReaderEntry['kind'] }) {
  const muted = useThemeColor('muted');
  if (kind !== 'explainer' || !detectCountry()) return null;
  return (
    <Pressable
      onPress={() => router.push('/crisis-resources?from=library')}
      accessibilityRole="link"
      accessibilityLabel="Need to talk to someone? Find support near you"
      className="mt-6 flex-row items-center gap-3 rounded-2xl bg-surface-secondary p-4 active:opacity-70"
      style={{ borderCurve: 'continuous' }}
    >
      <SymbolView name={HELP_ICON} size={16} tintColor={muted} />
      <AppText className="flex-1 text-sm font-semibold">Need to talk to someone? Find support near you</AppText>
      <SymbolView name={CHEVRON} size={13} tintColor={muted} />
    </Pressable>
  );
}

/**
 * "Read by the fire": the night page's warm dark laid over the whole reader,
 * whatever the Aa mode. Atmosphere only — narration is the audio. 30%, not
 * more: past that the dimmest light theme (nightly) drops body text below AA.
 */
export function FireDim() {
  const on = useAppStore((s) => s.readByFire);
  if (!on) return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} className="bg-reader-night-bg/30" />;
}
