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
