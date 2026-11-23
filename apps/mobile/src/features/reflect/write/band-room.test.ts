import { describe, expect, it } from "vitest";
import { type BandRoom, bandFits } from "./band-room";
import { FIELD_TEXT } from "./field-type";

/** `LAYOUT.texture.bottom - 34`, where the band sits over the bottom bar. */
const BAND_ABOVE_BAR = 82;
const LINE = FIELD_TEXT.lineHeight;

// Measured on an iPhone 17 simulator (874 pt) with the software keyboard up and
// nothing typed: Dynamic Type "Large" (default) and "Extra Large".
const IPHONE_17: BandRoom = {
	bandAboveBar: BAND_ABOVE_BAR,
	bandH: 149.33,
	boxTop: 199.33,
	liftBottom: 347,
	line: LINE,
	screenH: 874,
};
const IPHONE_17_XL: BandRoom = { ...IPHONE_17, bandH: 151.33, boxTop: 206 };

describe("bandFits", () => {
	it("keeps the texture band up over the keyboard at the default text size", () => {
		expect(bandFits(IPHONE_17)).toBe(true);
	});

	it("keeps it up one text size larger, where the room is just under three lines", () => {
		expect(bandFits(IPHONE_17_XL)).toBe(true);
	});

	it("keeps it up while the empty box still has its one placeholder line", () => {
		const room = IPHONE_17.screenH - IPHONE_17.liftBottom - BAND_ABOVE_BAR;
		const boxTop = room - IPHONE_17.bandH - LINE;
		expect(bandFits({ ...IPHONE_17, boxTop })).toBe(true);
	});

	it("lets it go only when it would cover the placeholder line", () => {
		const room = IPHONE_17.screenH - IPHONE_17.liftBottom - BAND_ABOVE_BAR;
		const boxTop = room - IPHONE_17.bandH - LINE + 1;
		expect(bandFits({ ...IPHONE_17, boxTop })).toBe(false);
	});
});
