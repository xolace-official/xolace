/**
 * The keyboard rule for every screen with a text field (Reflect v2 handoff §4), pure:
 *
 * - Keyboard up: whatever sits on the keyboard has its bottom edge exactly 12 pt above
 *   the keyboard's top edge (production's old Reflect composer: `kbH + 12`).
 * - Keyboard down: it sits on the safe area (at least 16 pt without a home indicator).
 * - Never both, and no jump: `bottom = max(rest, kbH + 12)` is continuous, where a
 *   ternary jumps ~38 pt on the keyboard's first frame.
 */
export const KEYBOARD_GAP = 12;
/** The floor on a phone without a home indicator. */
export const MIN_REST = 16;

/** Where a bar rests with the keyboard down. */
export const restFor = (insetBottom: number) => Math.max(insetBottom, MIN_REST);

/** The keyboard's height from keyboard-controller's `height`, which is negative while open. */
export function keyboardHeight(signedHeight: number) {
	"worklet";
	return Math.max(0, -signedHeight);
}

/** The bar's bottom edge above the screen's bottom. */
export function liftBottom(rest: number, keyboard: number) {
	"worklet";
	return Math.max(rest, keyboard + KEYBOARD_GAP);
}
