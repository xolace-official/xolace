import { useThemeColor } from 'heroui-native';
import type { MarkdownStyle } from 'react-native-enriched-markdown';
import { useCSSVariable } from 'uniwind';

import { useAppTheme } from '@/src/context/app-theme-context';
import { READING_MODES, type ReadingModeKey } from './reading-mode';

/**
 * The entry body's look for a reading mode (#401) at a base text size. Colours
 * come from tokens, so called inside `ReaderPageScope` they follow the page.
 * Sizes are base sizes: the OS text size still multiplies them, uncapped.
 * Until a mode's runtime fonts load it falls back to the theme's own face.
 */
export function useMarkdownStyle(mode: ReadingModeKey, size: number, fontsLoaded: boolean): MarkdownStyle {
  const [foreground, muted, accent, border, surface] = useThemeColor([
    'foreground',
    'muted',
    'accent',
    'border',
    'surface-secondary',
  ]);
  const [themeRegular, themeBold] = (useCSSVariable(['--font-normal', '--font-bold']) as string[]).map(String);
  const { face, lineHeight, page } = READING_MODES[mode];
  const { isLight } = useAppTheme();
  // Accent links clear AA (4.5:1) on every dark page and miss it on every light
  // one, Paper included (#415, measured per theme); there the underlined ink
  // carries the link. Re-measure when a theme's accent changes.
  const darkPage = page === 'night' || (page === 'app' && !isLight);
  // Clear and By the fire load at runtime; until then, the theme's face.
  const ready = fontsLoaded || mode === 'classic';
  const regular = ready ? face.regular : themeRegular;
  const bold = ready ? face.bold : themeBold;
  const italic = ready ? face.italic : themeRegular;
  const lh = (n: number) => Math.round(n * lineHeight);
  const px = (k: number) => Math.round(size * k);

  const heading = { fontFamily: bold, color: foreground, marginTop: 20, marginBottom: 8 };
  return {
    paragraph: { fontFamily: regular, fontSize: size, lineHeight: lh(size), color: foreground, marginBottom: px(0.9) },
    h1: { ...heading, fontSize: px(1.45), lineHeight: px(1.8) },
    h2: { ...heading, fontSize: px(1.22), lineHeight: px(1.55) },
    h3: { ...heading, fontSize: px(1.06), lineHeight: px(1.45) },
    strong: { fontFamily: bold, fontWeight: 'normal', color: foreground },
    // A face without a real italic (Space Grotesk) keeps the synthesized slant.
    em: { fontFamily: italic, fontStyle: italic === regular ? 'italic' : 'normal', color: foreground },
    link: { color: darkPage ? accent : foreground, underline: true },
    code: { color: foreground, backgroundColor: surface, borderColor: border },
    list: {
      fontFamily: regular,
      fontSize: size,
      lineHeight: lh(size),
      color: foreground,
      bulletColor: muted,
      markerColor: muted,
      marginBottom: px(0.9),
      itemSpacing: 6,
    },
    blockquote: {
      fontFamily: regular,
      fontSize: size - 1,
      lineHeight: lh(size - 1),
      color: foreground,
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 3,
      borderRadius: 12,
      padding: 12,
      gapWidth: 12,
      marginBottom: px(0.9),
    },
    thematicBreak: { color: border, marginTop: 8, marginBottom: 24 },
  };
}
