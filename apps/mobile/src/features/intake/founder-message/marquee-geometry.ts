export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 200;
export const CARD_STRIDE = CARD_WIDTH * 0.82;

export const beltSlots = (viewport: number, minSlots: number) =>
	Math.max(minSlots, Math.ceil((viewport + CARD_WIDTH) / CARD_STRIDE));

const mod = (a: number, m: number) => {
	"worklet";
	return ((a % m) + m) % m;
};

export const slotLeft = (
	index: number,
	offset: number,
	beltWidth: number,
	viewport: number
) => {
	"worklet";
	const left = mod(index * CARD_STRIDE - mod(offset, beltWidth), beltWidth);
	return left > viewport ? left - beltWidth : left;
};
