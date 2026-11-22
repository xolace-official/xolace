import { isWide } from "@/lib/wide-layout";
import { BOARD, type Stage } from "./first-run-motion";

export const BOARD_TEXT_MAX = 1.15;
type Control = { h: number; line: number; pad: number };

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

export const CONTROLS_BOTTOM = 810;

export const CONTROL_MIN_SCALE = 0.5;

export const SEAT_TITLE_MAX = 1.6;
export const SEAT_TEXT_MAX = 2.4;

/**
 * The board on a screen of `width` x `height`. A phone keeps the board at scale 1,
 * centred across and hung from the safe area; a wide screen (`isWide`) scales it up to fit and
 * centres it both ways, on a virtual screen of the real one divided by the scale.
 */
export function stageFor(
	width: number,
	height: number,
	insetTop: number
): Stage {
	if (!isWide({ height, width })) {
		return {
			dx: (width - BOARD.w) / 2,
			dy: insetTop - BOARD.status,
			H: height,
			inset: 0,
			s: 1,
			W: width,
		};
	}
	const s = Math.min(width / BOARD.w, height / BOARD.h);
	const W = width / s;
	const H = height / s;
	const dx = (W - BOARD.w) / 2;
	return { dx, dy: (H - BOARD.h) / 2, H, inset: dx, s, W };
}
