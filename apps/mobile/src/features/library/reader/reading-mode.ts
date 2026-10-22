/**
 * Reading modes (#401, CONTEXT.md "Library: reading mode"). A mode fixes the
 * typeface, line spacing and page at once; text size is the one control
 * outside them.
 */
import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_400Regular_Italic,
  AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Literata_400Regular, Literata_400Regular_Italic, Literata_700Bold } from '@expo-google-fonts/literata';
import { useFonts } from 'expo-font';

export type ReadingModeKey = 'classic' | 'clear' | 'fire';
export type ReaderPage = 'app' | 'paper' | 'night';

type Face = { regular: string; italic: string; bold: string };

export const READING_MODES: Record<
  ReadingModeKey,
  { label: string; blurb: string; face: Face; lineHeight: number; page: ReaderPage }
> = {
  classic: {
    label: 'Classic',
    blurb: 'The app’s own face and theme',
    // Space Grotesk whatever the app theme's face; it has no italic, so emphasis is a synthesized slant.
    face: { regular: 'SpaceGrotesk_400Regular', italic: 'SpaceGrotesk_400Regular', bold: 'SpaceGrotesk_700Bold' },
    lineHeight: 1.55,
    page: 'app',
  },
  clear: {
    label: 'Clear',
    blurb: 'Easy letters, roomier lines, paper',
    face: {
      regular: 'AtkinsonHyperlegibleNext_400Regular',
      italic: 'AtkinsonHyperlegibleNext_400Regular_Italic',
      bold: 'AtkinsonHyperlegibleNext_700Bold',
    },
    lineHeight: 1.75,
    page: 'paper',
  },
  fire: {
    label: 'By the fire',
    blurb: 'A book serif, warm and dim for night',
    face: { regular: 'Literata_400Regular', italic: 'Literata_400Regular_Italic', bold: 'Literata_700Bold' },
    lineHeight: 1.55,
    page: 'night',
  },
};

export const READING_MODE_KEYS = Object.keys(READING_MODES) as ReadingModeKey[];

/** Base sizes before the OS text size multiplies them; the body is never capped. */
export const TEXT_SIZES = [16, 17, 18, 20, 22, 24] as const;
export const DEFAULT_TEXT_SIZE = 18;

export function stepTextSize(size: number, by: 1 | -1): number {
  const i = TEXT_SIZES.indexOf(size as (typeof TEXT_SIZES)[number]);
  const from = i < 0 ? TEXT_SIZES.indexOf(DEFAULT_TEXT_SIZE) : i;
  return TEXT_SIZES[Math.min(Math.max(from + by, 0), TEXT_SIZES.length - 1)];
}

/** Loaded at runtime on first open; the native markdown view picks them up without a rebuild (#401). */
export function useReadingFonts(): boolean {
  const [loaded] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_400Regular_Italic,
    AtkinsonHyperlegibleNext_700Bold,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_700Bold,
  });
  return loaded;
}
