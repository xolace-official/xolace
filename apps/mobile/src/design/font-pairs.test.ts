import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_FONT_PAIR,
	FIXED_FACES,
	FONT_PAIR_IDS,
	FONT_PAIRS,
	FONT_ROLES,
	LEGACY_FACES,
	launchFaces,
	pairFaces,
} from "./font-pairs";
import { NIGHT_VARIANT, THEME_BY_ID, VARIANTS, variantFonts } from "./themes";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** `Figtree_400Regular_Italic` → its package folder and file, as @expo-google-fonts lays them out. */
const PACKAGE_OF: Record<string, string> = {
	AtkinsonHyperlegibleNext: "atkinson-hyperlegible-next",
	BricolageGrotesque: "bricolage-grotesque",
	DMSans: "dm-sans",
	Figtree: "figtree",
	Literata: "literata",
	Newsreader: "newsreader",
	Nunito: "nunito",
	SpaceGrotesk: "space-grotesk",
};
const FACE_KEY = /^([A-Za-z]+)_(\d+\w+?)(_Italic)?$/;

function fontFile(face: string): string {
	const m = face.match(FACE_KEY);
	if (!m) {
		throw new Error(`not a useFonts key: ${face}`);
	}
	const [, family, weight, italic = ""] = m;
	return join(
		root,
		"node_modules/@expo-google-fonts",
		PACKAGE_OF[family] ?? family,
		`${weight}${italic}`,
		`${face}.ttf`
	);
}

const sources = read("src/design/font-sources.ts");
const themesCss = read("src/themes/themes.generated.css");

/** One variant's `--font-<role>` values in the generated theme CSS. */
function cssFaces(variant: string): Record<string, string> {
	const block = themesCss.split(`@variant ${variant} {`)[1]?.split("}")[0];
	if (!block) {
		throw new Error(`no @variant ${variant}`);
	}
	const out: Record<string, string> = {};
	for (const m of block.matchAll(/--font-([a-z-]+): "([^"]+)";/g)) {
		out[m[1]] = m[2];
	}
	return out;
}

describe("font pairs", () => {
	it("every theme picks a pair, and every pair sets every role", () => {
		for (const theme of Object.values(THEME_BY_ID)) {
			expect(FONT_PAIR_IDS, theme.id).toContain(theme.fonts);
		}
		for (const id of FONT_PAIR_IDS) {
			expect(Object.keys(FONT_PAIRS[id]).sort(), id).toEqual(
				[...FONT_ROLES].sort()
			);
		}
	});

	it("every variant's generated CSS sets its theme's pair", () => {
		expect(VARIANTS).toHaveLength(22);
		for (const v of VARIANTS) {
			expect(cssFaces(v.name), v.name).toEqual(
				FONT_PAIRS[THEME_BY_ID[v.themeId].fonts]
			);
		}
	});

	it("keeps the owner's split: warm for Default and night, clear and playful by mood", () => {
		expect(variantFonts("light")).toBe("warm");
		expect(variantFonts(NIGHT_VARIANT)).toBe("warm");
		expect(variantFonts("quiet-dark")).toBe("clear");
		expect(variantFonts("noir-light")).toBe("clear");
		expect(variantFonts("playful-dark")).toBe("playful");
		// Anything Uniwind reports that isn't a variant draws Default's faces.
		expect(variantFonts("system")).toBe(DEFAULT_FONT_PAIR);
		expect(variantFonts(null)).toBe(DEFAULT_FONT_PAIR);
	});

	it("every face a pair, a fixed face or a legacy screen needs has a source and a file", () => {
		const needed = new Set([
			...FONT_PAIR_IDS.flatMap(pairFaces),
			...Object.values(FIXED_FACES),
			...LEGACY_FACES,
		]);
		for (const face of needed) {
			expect(sources, face).toMatch(
				new RegExp(`import \\{ ${face} \\} from "@expo-google-fonts/`)
			);
			expect(sources, face).toContain(`\t${face},`);
			expect(existsSync(fontFile(face)), fontFile(face)).toBe(true);
		}
	});

	it("waits at launch for Default's pair and the active one, each face once", () => {
		const faces = launchFaces("clear");
		expect(faces).toEqual([...new Set(faces)]);
		for (const face of [...pairFaces("warm"), ...pairFaces("clear")]) {
			expect(faces).toContain(face);
		}
		expect(faces).not.toContain(FONT_PAIRS.playful.normal);
		// On Default: Default's pair and the legacy Space Grotesk, nothing else.
		expect(launchFaces("warm")).toHaveLength(12);
		expect(launchFaces("warm")).not.toContain(FONT_PAIRS.clear.normal);
		// Fixed faces load where they're drawn, never at launch.
		for (const face of [
			FIXED_FACES.mirror,
			FIXED_FACES.letter,
			FIXED_FACES["reader-semi"],
		]) {
			expect(launchFaces("clear")).not.toContain(face);
		}
	});
});
