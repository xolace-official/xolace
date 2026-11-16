/** A colour's clear twin, from any colour string the themes and tokens write (hex, rgb, oklch). Pure. */
const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;
const OKLCH = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i;
const PERCENT = 100;
const CHANNEL = 255;

/** sRGB gamma on one linear channel, 0–255. */
const encode = (c: number) => {
	const v = c <= 0.003_130_8 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
	return Math.round(Math.min(1, Math.max(0, v)) * CHANNEL);
};

/** OKLCH (the themes' generated values) → sRGB channels. */
function oklchToRgb(
	l: number,
	c: number,
	hDeg: number
): [number, number, number] {
	const h = (hDeg * Math.PI) / 180;
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);
	const l_ = (l + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
	const m_ = (l - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
	const s_ = (l - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;
	return [
		encode(4.076_741_662_1 * l_ - 3.307_711_591_3 * m_ + 0.230_969_929_2 * s_),
		encode(-1.268_438_004_6 * l_ + 2.609_757_401_1 * m_ - 0.341_319_396_5 * s_),
		encode(-0.004_196_086_3 * l_ - 0.703_418_614_7 * m_ + 1.707_614_701 * s_),
	];
}

/** The same colour, fully clear: a gradient fades into it instead of into grey. */
export function clearOf(color: string): string {
	const hex = color.match(HEX);
	if (hex) {
		const v = Number.parseInt(hex[1], 16);
		return `rgba(${(v >> 16) & CHANNEL},${(v >> 8) & CHANNEL},${v & CHANNEL},0)`;
	}
	const rgb = color.match(RGB);
	if (rgb) {
		return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},0)`;
	}
	const ok = color.match(OKLCH);
	if (ok) {
		const l = Number(ok[1]) / (ok[2] ? PERCENT : 1);
		const [r, g, b] = oklchToRgb(l, Number(ok[3]), Number(ok[4]));
		return `rgba(${r},${g},${b},0)`;
	}
	return "transparent";
}
