export const DISMISS_DRAG = 120;
export const DISMISS_VELOCITY = 900;

const INSET_OVERLAP = 24;
const EDGE_GAP = 10;

export function shouldDismiss(translationY: number, velocityY: number) {
	"worklet";
	return translationY > DISMISS_DRAG || velocityY > DISMISS_VELOCITY;
}

export const sheetBottom = (insetBottom: number) =>
	Math.max(insetBottom - INSET_OVERLAP, EDGE_GAP);
