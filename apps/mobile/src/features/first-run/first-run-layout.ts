/**
 * Text that sits on the board's drawing at a fixed place (labels, hints, the cards) grows with
 * Dynamic Type up to here, past which it would run into the art. The words that carry meaning
 * are also in each part's accessibility label, and the seat's words, buttons and terms flow in
 * a column that grows at every size.
 */
export const BOARD_TEXT_MAX = 1.15;
/** The seat's title stops growing here so a word never breaks; its other text grows further. */
export const SEAT_TITLE_MAX = 1.6;
export const SEAT_TEXT_MAX = 2.4;
