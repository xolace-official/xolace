/**
 * SwiftUI (`@expo/ui` Text) looks fonts up by PostScript name, not by the
 * `useFonts` key. For the upright faces in src/design/font-pairs.ts the two
 * differ only in the weight part (`Figtree_700Bold` → `Figtree-Bold`); checked
 * against the font files (postscript-name.test.ts).
 */
export function postScriptName(key: string): string {
	if (key.includes("_Italic")) {
		throw new Error(`fonts: no PostScript rule for italic "${key}"`);
	}
	return key.replace(/_\d+/, "-");
}
