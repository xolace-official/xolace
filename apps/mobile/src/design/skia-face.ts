import { type SkTypeface, useTypeface } from "@shopify/react-native-skia";
import { FONT_PAIRS } from "./font-pairs";
import { FONT_SOURCES } from "./font-sources";
import { useFontPair } from "./fonts";

/**
 * The active theme's body face (`FONT_PAIRS[pair].normal`) as a Skia typeface, for text Skia
 * draws itself (Vent's burning words). Skia loads the same font file AppText uses, straight from
 * its asset: on Android, Skia's system font manager can't see the faces expo-font registered, so
 * matching by family name would fall back to Roboto. Null until it has loaded; it reloads when
 * the theme's pair changes.
 */
export function useSkiaBodyFace(): SkTypeface | null {
	const face = FONT_PAIRS[useFontPair()].normal;
	return useTypeface(FONT_SOURCES[face]);
}
