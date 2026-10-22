import { useThemeColor } from 'heroui-native';
import { mergeThemes, type DeepPartial, type Theme } from 'stream-chat-expo';
import { useAppTheme } from '@/src/context/app-theme-context';

/**
 * Bridges Xolace theme tokens into Stream's design-token layer.
 *
 * Stream v9 resolves every component colour from `theme.semantics`, and
 * `mergeThemes` deep-merges whatever we pass over its resolved defaults — so
 * overriding the semantic layer alone re-skins the whole chat surface without
 * touching per-component style keys.
 *
 * It must be applied to BOTH `OverlayProvider` and `Chat`: the long-press
 * message menu renders inside the overlay host, which sits above `Chat` in the
 * tree and therefore reads the provider's own ThemeProvider.
 */
export function useStreamTheme(): DeepPartial<Theme> {
  const { isDark } = useAppTheme();

  const [
    background,
    foreground,
    surface,
    surfaceSecondary,
    surfaceTertiary,
    overlay,
    muted,
    accent,
    accentForeground,
    border,
    separator,
    danger,
    field,
    fieldPlaceholder,
  ] = useThemeColor([
    'background',
    'foreground',
    'surface',
    'surface-secondary',
    'surface-tertiary',
    'overlay',
    'muted',
    'accent',
    'accent-foreground',
    'border',
    'separator',
    'danger',
    'field',
    'field-placeholder',
  ]);

  // Stream picks its light/dark base from RN's `useColorScheme()` — the system
  // appearance — which knows nothing about our in-app theme switcher. A light
  // Xolace theme on a dark phone got Stream's dark base, and every one of the
  // ~500 tokens we don't name below fell through to it: that is why composer
  // text (`inputTextDefault`) was unreadable. Resolving the base ourselves for
  // OUR scheme makes the whole set consistent before the overrides tint it.
  const base = mergeThemes({ scheme: isDark ? 'dark' : 'light' });

  return {
    // The reaction picker is the seven curated reactions and nothing else
    // (#345); Stream's "+" opens a second sheet of the same set.
    messageMenu: { reactionPicker: { emojiViewerButton: { display: 'none' } } },
    semantics: {
      ...base.semantics,

      accentError: danger,
      accentPrimary: accent,

      backgroundCoreApp: background,
      backgroundCoreElevation0: background,
      backgroundCoreElevation1: surface,
      backgroundCoreElevation2: overlay,
      backgroundCoreElevation3: overlay,
      backgroundCoreSurfaceCard: surface,
      backgroundCoreSurfaceDefault: surfaceSecondary,
      backgroundCoreSurfaceStrong: surfaceTertiary,
      backgroundCoreSurfaceSubtle: field,
      backgroundUtilityPressed: surfaceTertiary,
      backgroundUtilitySelected: surfaceTertiary,

      borderCoreDefault: border,
      borderCoreSubtle: separator,

      // Outgoing rides the accent; incoming stays on a surface so the two read
      // as "me" and "them" without a second hue entering the palette.
      chatBgIncoming: surfaceSecondary,
      chatBgOutgoing: accent,
      chatBgAttachmentIncoming: surfaceTertiary,
      chatBgAttachmentOutgoing: accent,
      chatTextIncoming: foreground,
      chatTextOutgoing: accentForeground,
      chatTextSystem: muted,
      chatTextTimestamp: muted,
      chatTextUsername: muted,

      // The composer's TextInput reads these two directly, not textPrimary.
      inputTextDefault: foreground,
      inputTextPlaceholder: fieldPlaceholder,
      inputTextIcon: muted,

      textPrimary: foreground,
      textSecondary: muted,
      textTertiary: fieldPlaceholder,
      textOnAccent: accentForeground,
      textLink: accent,
    },
  };
}
