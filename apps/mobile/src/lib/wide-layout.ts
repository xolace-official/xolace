import { useWindowDimensions } from "react-native";

/**
 * Wide screens (iPad). The app is drawn for phones; on a screen whose shortest
 * side reaches WIDE_MIN_SIDE a few places cap or grow so they don't stretch
 * thin across it. Every helper here returns its phone value untouched below
 * the breakpoint, so phones lay out exactly as before.
 */

/** The widest iPhone is 440 pt across; the smallest iPad is 744. */
export const WIDE_MIN_SIDE = 600;

/** A reading column on wide screens: about 70 characters of 17–19 pt body. */
export const READING_WIDTH = 640;

/** How many tiles a horizontal row shows across on wide screens: the half is the peek that says it scrolls. */
const ROW_SLOTS = 4.5;

export type Screen = { width: number; height: number };

export function isWide({ width, height }: Screen): boolean {
	return Math.min(width, height) >= WIDE_MIN_SIDE;
}

export function useScreen(): Screen & { wide: boolean } {
	const { width, height } = useWindowDimensions();
	return { height, wide: isWide({ height, width }), width };
}

/** Side padding that centres a column at most `column` wide on wide screens; `pad` on phones. */
export function columnPad(
	screen: Screen,
	pad: number,
	column = READING_WIDTH
): number {
	return isWide(screen) ? Math.max(pad, (screen.width - column) / 2) : pad;
}

/** `size`, held to at most `max` on wide screens. */
export function capped(screen: Screen, size: number, max: number): number {
	return isWide(screen) ? Math.min(size, max) : size;
}

/**
 * A tile's edge in a horizontal row. On wide screens it grows from its phone
 * `size` until ROW_SLOTS tiles span the row (`row` wide, `gap` between); it
 * never shrinks below `size`.
 */
export function rowTile(
	screen: Screen,
	{ size, gap, row }: { size: number; gap: number; row: number }
): number {
	if (!isWide(screen)) {
		return size;
	}
	const gaps = Math.floor(ROW_SLOTS) * gap;
	return Math.max(size, Math.floor((row - gaps) / ROW_SLOTS));
}
