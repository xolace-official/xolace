import { FONTS } from "@/design/type";
import { LAYOUT, T2 } from "../session-look";

const C = LAYOUT.card;

/** `.q`: the quote, Newsreader italic 19.5/27. */
export const QUOTE = {
	fontFamily: FONTS.mirror,
	fontSize: C.quote,
	lineHeight: C.quoteLine,
} as const;

/**
 * The write-on's timing (Peers' `T` and `MOTION`): 160 ms in, lines 260 apart,
 * a 420 ms sweep, the 56 pt soft head, and the warm glow copy (≤ .34 mid-sweep).
 */
export const WRITE = {
	cpl: T2.write.cpl,
	glow: { at: 0.45, max: 0.34, r: 8 },
	head: 56,
	lead: T2.write.lead,
	line: T2.write.line,
	rowAfter: 420,
	rowMs: 400,
	sweep: T2.write.sweep,
} as const;

/** When line L's sweep starts, in ms of the write (board `wordsOf`: 160 + 260·L). */
export const lineStart = (line: number) => {
	"worklet";
	return WRITE.lead + line * WRITE.line;
};
/** The write is done once the last line's sweep has run and the row has faded in. */
export const writeEnd = (lines: number) => {
	"worklet";
	return (
		lineStart(Math.max(0, lines - 1)) +
		WRITE.sweep +
		WRITE.rowAfter +
		WRITE.rowMs
	);
};
