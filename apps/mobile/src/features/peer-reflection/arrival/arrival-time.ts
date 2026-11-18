/**
 * The arrival's clock (board `T`), as pure worklets of one value in board ms
 * (mailbox-inbox's single stagger value): the title, every card's rise, line,
 * star and bloom read the same value, so a card's rise and its line's draw
 * start in the same frame.
 */
import { MOTION, T } from "../peers-look";

export const clamp01 = (x: number) => {
	"worklet";
	return Math.min(1, Math.max(0, x));
};

/** When card i starts rising (board `T.first + i·T.step`). */
export const cardStart = (i: number) => {
	"worklet";
	return T.first + i * T.step;
};

/** How many cards have landed at arrival time `a`. */
export const landedAt = (a: number, n: number) => {
	"worklet";
	return a < T.first ? 0 : Math.min(n, Math.floor((a - T.first) / T.step) + 1);
};

/** When the face starts reading along: 1.5 s after the last card starts. */
export const readAt = (n: number) =>
	cardStart(Math.max(0, n - 1)) + MOTION.readAfter;

/** Words in the title, for its write-on's length. */
export const wordsIn = (rows: readonly string[]) =>
	rows.join(" ").split(" ").filter(Boolean).length;
