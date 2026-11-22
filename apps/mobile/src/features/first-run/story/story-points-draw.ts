import { type SkCanvas, Skia, TileMode } from "@shopify/react-native-skia";
import { STORY } from "../copy";
import type { FireInk } from "../fire-ink";
import { clamp, ease, easeIO, lerp, mod, seg, TAU } from "../first-run-motion";
import { css, STORY_COLORS } from "../first-run-palette";
import {
	AUTH,
	ageAuth,
	ageOf,
	ageSeat,
	ageT,
	bIf,
	FIRE0,
	FLD,
	PROV,
	SEAT_PT,
	type SEng,
	VENT_O,
} from "./story-scene";

const noise = (n: number) => {
	const v = Math.sin(n * 12.9898) * 43_758.5453;
	return v - Math.floor(v);
};
const COUNT = STORY.count;
const RANKS = (() => {
	const order = Array.from(
		{ length: COUNT },
		(_, i) => [noise(i + 300), i] as const
	).sort((a, b) => a[0] - b[0]);
	const r: number[] = [];
	order.forEach((o, k) => {
		r[o[1]] = k;
	});
	return r;
})();
export const EMB = Array.from({ length: COUNT }, (_, i) => {
	const a = i * 2.399_96 + 0.4;
	const r = 1.12 + 0.62 * noise(i + 500);
	return {
		band: i % 3,
		rank: RANKS[i],
		x: clamp(0.5 + Math.cos(a) * 0.4 * r, 0.03, 0.97),
		y: clamp(0.5 + Math.sin(a) * 0.36 * r, 0.04, 0.96),
	};
});
const BANDS = [
	{ o: 0.4, s: 2 },
	{ o: 0.65, s: 3 },
	{ o: 0.95, s: 4 },
];
const SPARK_N = 10;

function spark(
	c: SkCanvas,
	ink: FireInk,
	x: number,
	y: number,
	sz: number,
	o: number
) {
	"worklet";
	if (o <= 0.003) {
		return;
	}
	const g = Skia.Paint();
	g.setColor(Skia.Color(ink.sparkGlow));
	g.setAlphaf(0.75 * o);
	g.setMaskFilter(Skia.MaskFilter.MakeBlur(0, 3, true));
	c.drawCircle(x, y, sz / 2 + 1, g);
	const d = Skia.Paint();
	d.setColor(Skia.Color(ink.spark));
	d.setAlphaf(o);
	c.drawCircle(x, y, sz / 2, d);
}

export function cover(c: SkCanvas, e: SEng, a: number, ink: FireInk) {
	"worklet";
	const bb = bIf(e, 0);
	const t = ageT(e);
	for (let i = 0; i < 6 && bb >= 900; i++) {
		const per = 2400 + (i % 3) * 400;
		const since = t - (900 + i * 380);
		if (since < 0) {
			continue;
		}
		const p = mod(since, per) / per;
		const sz = 2 + (i % 3);
		spark(
			c,
			ink,
			FIRE0.x + Math.sin(p * TAU + i) * 6 + (i % 2 ? 1 : -1) * p * 12,
			FIRE0.y - 10 - p * (120 + (i % 4) * 20),
			sz,
			Math.sin(Math.PI * p) * 0.85 * a
		);
	}
	const puff = ageOf(e, e.puff);
	for (let i = 0; i < 8 && puff >= 0 && bb < 99_999; i++) {
		const p = seg(puff, i * 40, i * 40 + 1100);
		if (p <= 0 || p >= 1) {
			continue;
		}
		const ang = -Math.PI / 2 + (i - 3.5) * 0.3;
		const r = 30 + 110 * ease(p) + (i % 3) * 14;
		spark(
			c,
			ink,
			FIRE0.x + Math.cos(ang) * r,
			FIRE0.y - 6 + Math.sin(ang) * r * 1.2,
			3 + (i % 2) * 2,
			(1 - p) * a
		);
	}
}

export function ripples(c: SkCanvas, e: SEng, a: number, ink: FireInk) {
	"worklet";
	const age = ageOf(e, e.ripAt);
	if (age < 0) {
		return;
	}
	const p0 = Skia.Paint();
	p0.setStyle(1);
	p0.setStrokeWidth(1);
	for (let i = 0; i < 3; i++) {
		const p = seg(age, i * 140, i * 140 + 1000);
		if (p <= 0 || p >= 1) {
			continue;
		}
		p0.setColor(Skia.Color(ink.ripple));
		p0.setAlphaf(0.7 * 0.8 * (1 - p) * a);
		const sx = 1 + 7 * ease(p);
		const sy = 1 + 4 * ease(p);
		c.drawOval(
			Skia.XYWHRect(e.ripX - 10 * sx, e.ripY - 4 * sy, 20 * sx, 8 * sy),
			p0
		);
	}
}

export function vent(c: SkCanvas, e: SEng, a: number, ink: FireInk) {
	"worklet";
	const bb = bIf(e, 2);
	if (bb > 90_000) {
		return;
	}
	const t = ageT(e);
	const v = e.vent;
	const start = bb - 1000;
	if (start < 0) {
		return;
	}
	for (let i = 0; i < 22; i++) {
		if (i / 22 >= 0.22 + 0.78 * v) {
			continue;
		}
		const per = 1500 + (i % 5) * 200;
		const p = mod(t + (i / 22) * per * 3.1, per) / per;
		const sz = 2 + (i % 3) + v;
		const x =
			VENT_O.x +
			p * (26 + (i % 4) * 14) * (1 + 0.7 * v) +
			Math.sin(p * 6 + i) * 6;
		const y = VENT_O.y - p * (80 + (i % 5) * 22) * (1 + 0.9 * v);
		spark(
			c,
			ink,
			x,
			y,
			sz,
			Math.sin(Math.PI * p) * (0.55 + 0.45 * v) * Math.min(1, start / 600) * a
		);
	}
}

export function embers(c: SkCanvas, e: SEng, a: number, ink: FireInk) {
	"worklet";
	const bb = bIf(e, 3);
	const fa = ageOf(e, e.flareAt);
	const d = Skia.Paint();
	for (let i = 0; i < COUNT; i++) {
		const p = EMB[i];
		const band = BANDS[p.band];
		let o: number;
		let s = band.s * 1.5;
		if (e.rm) {
			o = band.o;
		} else {
			const at = 450 + p.rank * 62;
			const q = seg(bb, at, at + 260);
			o = band.o * ease(q);
			s *= 1 + 0.8 * Math.exp(-Math.max(0, bb - at) / 200) * (q > 0 ? 1 : 0);
		}
		const x = FLD.x + p.x * FLD.w;
		const y = FLD.y + p.y * FLD.h;
		if (e.flareI === i && fa >= 0 && fa < 1400) {
			const f = 1 - fa / 1400;
			s *= 1 + 1.6 * f;
			o = Math.min(1, o + f);
			const g = Skia.Paint();
			g.setColor(Skia.Color(ink.emberFlare));
			g.setAlphaf(0.6 * f * a);
			g.setMaskFilter(Skia.MaskFilter.MakeBlur(0, 7, true));
			c.drawCircle(x, y, s / 2 + 5, g);
		}
		if (o * a <= 0.003) {
			continue;
		}
		d.setColor(Skia.Color(css(STORY_COLORS.count)));
		d.setAlphaf(o * a);
		c.drawCircle(x, y, s / 2, d);
	}
}

export function seat(c: SkCanvas, e: SEng, so: number, ink: FireInk) {
	"worklet";
	const sa = ageSeat(e);
	if (sa < 0 || so <= 0) {
		return;
	}
	const aa = ageAuth(e);
	const seated =
		aa >= AUTH.seated
			? e.rm
				? 1
				: ease(seg(aa, AUTH.seated, AUTH.seated + 600))
			: 0;
	const logIn = e.rm ? 1 : ease(seg(sa, 420, 870));
	const br =
		0.35 *
		(e.rm
			? 1
			: ease(seg(sa, 700, 1300)) *
				(0.8 + 0.2 * Math.sin((ageT(e) / 1600) * TAU)));
	const glow = Math.max(br, seated) * logIn * so;
	if (glow > 0.003) {
		const sc = 1 + 0.25 * seated;
		const p = Skia.Paint();
		p.setAlphaf(Math.min(1, glow));
		p.setShader(
			Skia.Shader.MakeRadialGradient(
				{ x: 0, y: 0 },
				64,
				ink.seatGlow.map((k) => Skia.Color(k)),
				null,
				TileMode.Clamp
			)
		);
		c.save();
		c.translate(SEAT_PT.x, 470 - 46 + 35);
		c.scale(sc, (sc * 35) / 64);
		c.drawCircle(0, 0, 64, p);
		c.restore();
	}
	if (aa < 0 || e.rm) {
		return;
	}
	const from = { x: 195, y: e.authProv === PROV.apple ? 655 : 719 };
	if (aa >= AUTH.back && aa < AUTH.seated + 50) {
		const q = easeIO(seg(aa, AUTH.back, AUTH.seated));
		const x = lerp(from.x, SEAT_PT.x, q);
		const y = lerp(from.y, SEAT_PT.y, q) - 120 * Math.sin(Math.PI * q);
		const r = 6 * (1 + 0.6 * Math.sin(Math.PI * q));
		const p = Skia.Paint();
		p.setAlphaf(Math.min(1, (aa - AUTH.back) / 120));
		p.setShader(
			Skia.Shader.MakeRadialGradient(
				{ x, y },
				r,
				ink.coal.map((k) => Skia.Color(k)),
				[0, 0.3, 0.55, 0.72],
				TileMode.Clamp
			)
		);
		c.drawCircle(x, y, r, p);
	}
	for (let i = 0; i < SPARK_N; i++) {
		const p = seg(aa, AUTH.seated + i * 35, AUTH.seated + 1100 + i * 35);
		if (p <= 0 || p >= 1) {
			continue;
		}
		const ang = -Math.PI / 2 + (i - 4.5) * 0.32;
		const r = 14 + 70 * ease(p);
		spark(
			c,
			ink,
			SEAT_PT.x + Math.cos(ang) * r,
			SEAT_PT.y - 4 + Math.sin(ang) * r * 1.3,
			2 + (i % 3),
			1 - p
		);
	}
}
