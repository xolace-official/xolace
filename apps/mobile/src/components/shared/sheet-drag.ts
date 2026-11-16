/** A DetachedSheet's geometry and dismiss rule, pure. */

/** Dragged this far down, or flicked this fast, the sheet closes. */
export const DISMISS_DRAG = 120;
export const DISMISS_VELOCITY = 900;

/** The sheet floats this far over the home indicator's inset, and never closer than the edge gap. */
const INSET_OVERLAP = 24;
const EDGE_GAP = 10;

export function shouldDismiss(translationY: number, velocityY: number) {
	"worklet";
	return translationY > DISMISS_DRAG || velocityY > DISMISS_VELOCITY;
}

export const sheetBottom = (insetBottom: number) =>
	Math.max(insetBottom - INSET_OVERLAP, EDGE_GAP);
