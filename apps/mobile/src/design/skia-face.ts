import { Skia, type SkTypeface } from "@shopify/react-native-skia";

/** A face the font manager returns for a family it doesn't have draws glyph 0 for everything. */
const PROBE_SIZE = 12;
const UPRIGHT = { slant: 0, width: 5 } as const;

/**
 * A body typeface for Skia text, by family name and weight (`BODY_FAMILY` in font-pairs.ts).
 * Skia's system font manager finds the faces expo-font registered, but for a family that isn't
 * loaded it hands back a face with no glyphs, which would draw nothing; then this falls back to
 * the system face. Runs on either thread.
 */
export function matchBodyFace(
	family: string,
	weight: number
): SkTypeface | null {
	"worklet";
	const mgr = Skia.FontMgr.System();
	const style = { ...UPRIGHT, weight };
	const face = mgr.matchFamilyStyle(family, style);
	if (face && Skia.Font(face, PROBE_SIZE).getGlyphIDs("a")[0] !== 0) {
		return face;
	}
	return mgr.matchFamilyStyle("System", style);
}
