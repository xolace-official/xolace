interface Lab {
	a: number;
	b: number;
	L: number;
	opacity: number;
}

const COLOR_FN = /^(rgba?|oklch)\((.*)\)$/;
const ARG_SEPARATOR = /[\s,/]+/;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const toLinear = (c: number) =>
	c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const fromLinear = (c: number) =>
	c <= 0.003_130_8 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

function rgbToLab(r: number, g: number, b: number, opacity: number): Lab {
	const [lr, lg, lb] = [r, g, b].map((c) => toLinear(c / 255));
	const l = Math.cbrt(
		0.412_221_470_8 * lr + 0.536_332_536_3 * lg + 0.051_445_992_9 * lb
	);
	const m = Math.cbrt(
		0.211_903_498_2 * lr + 0.680_699_545_1 * lg + 0.107_396_956_6 * lb
	);
	const s = Math.cbrt(
		0.088_302_461_9 * lr + 0.281_718_837_6 * lg + 0.629_978_700_5 * lb
	);
	return {
		a: 1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s,
		b: 0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s,
		L: 0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s,
		opacity,
	};
}

function labToRgb({ L, a, b }: Lab): [number, number, number] {
	const l = (L + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
	const m = (L - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
	const s = (L - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;
	const lin = [
		4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
		-1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
		-0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s,
	];
	return lin.map((c) => Math.round(clamp01(fromLinear(c)) * 255)) as [
		number,
		number,
		number,
	];
}

const num = (s: string, percentScale: number) =>
	s.endsWith("%")
		? (Number.parseFloat(s) / 100) * percentScale
		: Number.parseFloat(s);

function parse(input: string): Lab {
	const s = input.trim().toLowerCase();
	if (s === "transparent") {
		return { a: 0, b: 0, L: 0, opacity: 0 };
	}
	if (s.startsWith("#")) {
		let h = s.slice(1);
		if (h.length === 3 || h.length === 4) {
			h = [...h].map((c) => c + c).join("");
		}
		const v = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
		return rgbToLab(v(0), v(2), v(4), h.length === 8 ? v(6) / 255 : 1);
	}
	const fn = s.match(COLOR_FN);
	if (!fn) {
		throw new Error(`color: can't read "${input}"`);
	}
	const parts = fn[2].split(ARG_SEPARATOR).filter(Boolean);
	const opacity = parts[3] === undefined ? 1 : num(parts[3], 1);
	if (fn[1] === "oklch") {
		const L = num(parts[0], 1);
		const C = num(parts[1], 0.4);
		const H = (Number.parseFloat(parts[2]) * Math.PI) / 180;
		return { a: C * Math.cos(H), b: C * Math.sin(H), L, opacity };
	}
	return rgbToLab(
		num(parts[0], 255),
		num(parts[1], 255),
		num(parts[2], 255),
		opacity
	);
}

function format(c: Lab): string {
	const [r, g, b] = labToRgb(c);
	if (c.opacity >= 0.999) {
		return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
	}
	return `rgba(${r}, ${g}, ${b}, ${Math.round(c.opacity * 1000) / 1000})`;
}

export function mix(a: string, b: string, amount: number): string {
	const x = parse(a);
	const y = parse(b);
	const t = amount;
	return format({
		a: x.a + (y.a - x.a) * t,
		b: x.b + (y.b - x.b) * t,
		L: x.L + (y.L - x.L) * t,
		opacity: x.opacity + (y.opacity - x.opacity) * t,
	});
}

export function alpha(color: string, value: number): string {
	return format({ ...parse(color), opacity: value });
}
