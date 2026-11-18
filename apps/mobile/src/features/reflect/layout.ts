import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Reflect's layout, in the board's points (design/boards/ReflectAlive.dc.html, style block).
 * The board's phone is 390 × 844 with a 47 pt status bar; on a taller phone, values anchored to
 * the top keep their distance under the status bar, and values anchored to the bottom keep
 * theirs above the home indicator.
 */
const BOARD_STATUS = 47;

/** Board y (from the top of the board's phone) → this phone's y. */
export function useBoardY(): (y: number) => number {
	const { top } = useSafeAreaInsets();
	return (y) => top - BOARD_STATUS + y;
}

export const LAYOUT = {
	actions: { bottom: 34, side: 16 },
	awayLink: { bottom: 44 },
	bar: { gap: 10, height: 56, mic: 56, side: 16 },
	care: { bottom: 30, side: 16 },
	enso: { face: 64, size: 200, top: 300 },
	/** The bottom glow: 24 in, 56 below the screen, 150 tall. */
	glow: { below: 56, blur: 26, height: 150, side: 24 },
	header: { button: 44, height: 44, side: 16, top: 54 },
	heard: { enso: 150, face: 56, top: 220 },
	mirror: { face: 30, gap: 20, labelRow: 32, lineGap: 10, side: 24, top: 110 },
	next: {
		face: 44,
		headTop: 248,
		mark: 52,
		mirrorTop: 110,
		tileGap: 12,
		tilesTop: 336,
	},
	slow: { side: 24, top: 590 },
	stageLine: { side: 30, top: 528 },
	texture: {
		aboveBar: 22,
		bottom: 116,
		chip: 34,
		chipGap: 8,
		segment: 36,
		side: 20,
	},
	words: { side: 24, top: 110 },
	write: {
		box: 226,
		chip: 26,
		face: 44,
		faceGap: 12,
		gap: 14,
		side: 24,
		top: 112,
	},
} as const;

/** While writing, the caret stays this far above the bar's top (handoff §4.6). */
export const CARET_CLEAR = 16;
