import { describe, expect, it } from "vitest";
import { type FaceTokens, faceColors } from "./face-colors";
import { PALETTES } from "./face-palette";

/** Each token named for itself, so a test can see which one a colour came from. */
const TOKENS: FaceTokens = {
	accent: "accent",
	accentFg: "accentFg",
	bg: "bg",
	blush: "blush",
	brow: "brow",
	fg: "fg",
	highlight: "highlight",
	highlightClear: "highlightClear",
	muted: "muted",
	pupil: "pupil",
	sclera: "sclera",
};

describe("faceColors", () => {
	it("draws chalk flat in the text colour, ignoring the palette", () => {
		const c = faceColors({ body: "square", palette: "ember", tokens: TOKENS });
		expect(c.gradient).toBeNull();
		expect(c.solid).toBe("fg");
		expect(c.shine).toBe(false);
		expect(c.colors).toEqual({
			blush: "blush",
			brow: "bg",
			highlight: "highlight",
			mouth: "bg",
			pupil: "fg",
			sclera: "bg",
		});
	});

	it("uses the brand gradient by default, with its own mouth", () => {
		const c = faceColors({ body: "flame", tokens: TOKENS });
		expect(c.gradient).toBe(PALETTES.brand);
		expect(c.shine).toBe(true);
		expect(c.colors.mouth).toBe(PALETTES.brand.mouth);
		expect(c.colors.brow).toBe("brow");
	});

	it("uses a chosen gradient set", () => {
		const c = faceColors({ body: "flame", palette: "sea", tokens: TOKENS });
		expect(c.gradient).toBe(PALETTES.sea);
		expect(c.colors.mouth).toBe(PALETTES.sea.mouth);
	});

	it("follows the theme accent on an orb, or when asked", () => {
		for (const c of [
			faceColors({ body: "orb", tokens: TOKENS }),
			faceColors({ body: "flame", palette: "theme", tokens: TOKENS }),
		]) {
			expect(c.gradient).toBeNull();
			expect(c.solid).toBe("accent");
			expect(c.colors.brow).toBe("accentFg");
			expect(c.colors.mouth).toBe("accentFg");
		}
	});

	it("rests in the muted grey", () => {
		const c = faceColors({ body: "flame", palette: "muted", tokens: TOKENS });
		expect(c.gradient).toBeNull();
		expect(c.solid).toBe("muted");
		expect(c.shine).toBe(true);
		expect(c.colors.brow).toBe("bg");
		expect(c.colors.mouth).toBe("bg");
	});
});
