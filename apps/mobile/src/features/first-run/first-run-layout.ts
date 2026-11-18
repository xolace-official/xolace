/**
 * Text that sits on the board's drawing at a fixed place (labels, hints, the cards) grows with
 * Dynamic Type up to here, past which it would run into the art. The words that carry meaning
 * are also in each part's accessibility label, and the seat's words, buttons and terms flow in
 * a column that grows at every size.
 */
export const BOARD_TEXT_MAX = 1.15;
type Control = { h: number; line: number; pad: number };

/**
 * The board's bottom controls ("I'd like that" over the account link, "Pull up a seat"), stacked
 * from `top`: their labels follow Dynamic Type, and each box grows with its line until the stack would pass `bottom` (the home indicator's edge). Past that the boxes stop
 * and each label's type stops at `max` (iOS drops a line taller than its box, so the label would
 * vanish), so a control never covers the words above it.
 */
export function controlStack(
	top: number,
	gap: number,
	bottom: number,
	controls: readonly Control[],
	fontScale: number
) {
	let lines = 0;
	let fixed = gap * (controls.length - 1);
	for (const c of controls) {
		lines += c.line;
		fixed += c.pad;
	}
	const scale = Math.min(fontScale, (bottom - top - fixed) / lines);
	let y = top;
	return controls.map((c) => {
		const h = Math.max(c.h, Math.floor(c.line * scale + c.pad));
		const box = { h, max: Math.min(scale, (h - c.pad) / c.line), top: y };
		y += box.h + gap;
		return box;
	});
}

/** The home indicator's edge on the board: controls stop growing here. */
export const CONTROLS_BOTTOM = 810;

/** The smallest a grown control's label shrinks to fit its width. */
export const CONTROL_MIN_SCALE = 0.5;

/** The seat's title stops growing here so a word never breaks; its other text grows further. */
export const SEAT_TITLE_MAX = 1.6;
export const SEAT_TEXT_MAX = 2.4;
