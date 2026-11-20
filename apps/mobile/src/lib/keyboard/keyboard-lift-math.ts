export const KEYBOARD_GAP = 12;
export const MIN_REST = 16;

export const restFor = (insetBottom: number) => Math.max(insetBottom, MIN_REST);

/** The keyboard's height from keyboard-controller's `height`, which is negative while open. */
export function keyboardHeight(signedHeight: number) {
	"worklet";
	return Math.max(0, -signedHeight);
}

export function liftBottom(rest: number, keyboard: number) {
	"worklet";
	return Math.max(rest, keyboard + KEYBOARD_GAP);
}
