export type BandRoom = {
	screenH: number;
	liftBottom: number;
	bandAboveBar: number;
	bandH: number;
	boxTop: number;
	/** One line of the writing box at the current text size. */
	line: number;
};

/**
 * Whether the texture band fits over the keyboard without covering the writing
 * box. The band leaves on the first word, so it only ever shares the screen with
 * an empty box: it needs to clear the placeholder's one line, not room to write.
 */
export function bandFits(r: BandRoom): boolean {
	"worklet";
	const top = r.screenH - r.liftBottom - r.bandAboveBar - r.bandH;
	return top - r.boxTop >= r.line;
}
