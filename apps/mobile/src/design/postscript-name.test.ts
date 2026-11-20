import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXED_FACES, FONT_PAIR_IDS, pairFaces } from "./font-pairs";
import { postScriptName } from "./postscript-name";

const fonts = join(
	import.meta.dirname,
	"../../node_modules/@expo-google-fonts"
);
const PACKAGE_OF: Record<string, string> = {
	BricolageGrotesque: "bricolage-grotesque",
	DMSans: "dm-sans",
	Figtree: "figtree",
	Literata: "literata",
	Newsreader: "newsreader",
	Nunito: "nunito",
	SpaceGrotesk: "space-grotesk",
};
const POSTSCRIPT_NAME_ID = 6;
const WINDOWS = 3;

function postScriptNameIn(file: string): string {
	const buf = readFileSync(file);
	const tables = buf.readUInt16BE(4);
	for (let i = 0; i < tables; i++) {
		const rec = 12 + i * 16;
		if (buf.toString("latin1", rec, rec + 4) !== "name") {
			continue;
		}
		const name = buf.readUInt32BE(rec + 8);
		const count = buf.readUInt16BE(name + 2);
		const strings = name + buf.readUInt16BE(name + 4);
		for (let r = 0; r < count; r++) {
			const at = name + 6 + r * 12;
			if (buf.readUInt16BE(at + 6) !== POSTSCRIPT_NAME_ID) {
				continue;
			}
			const length = buf.readUInt16BE(at + 8);
			const start = strings + buf.readUInt16BE(at + 10);
			const raw = buf.subarray(start, start + length);
			return buf.readUInt16BE(at) === WINDOWS
				? raw.swap16().toString("utf16le")
				: raw.toString("latin1");
		}
	}
	throw new Error(`no PostScript name in ${file}`);
}

const fileOf = (key: string) => {
	const [family, weight] = key.split("_");
	return join(fonts, PACKAGE_OF[family], weight, `${key}.ttf`);
};

describe("postScriptName", () => {
	const upright = [
		...new Set([
			...FONT_PAIR_IDS.flatMap(pairFaces),
			FIXED_FACES.letter,
			FIXED_FACES.poster,
			FIXED_FACES["poster-semi"],
			FIXED_FACES.reader,
		]),
	].filter((key) => !key.includes("_Italic"));

	it.each(upright)("%s matches the name inside its font file", (key) => {
		expect(postScriptName(key)).toBe(postScriptNameIn(fileOf(key)));
	});

	it("refuses italics, whose names don't follow the rule", () => {
		expect(() => postScriptName("Figtree_400Regular_Italic")).toThrow("italic");
	});
});
