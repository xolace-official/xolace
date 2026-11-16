import {
	BlurStyle,
	Canvas,
	Picture,
	type SkCanvas,
	Skia,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import {
	age,
	type Eng,
	type Geo,
	liftAt,
	NE,
	NP,
	outAt,
	RING,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { EMBER } from "@/features/achievements/badge-palette";
import { easeOut, seg, TAU } from "@/features/achievements/motion-math";

/** None born after this, so they end by ~8.4 s. */
const EMBERS_UNTIL = 7600;
const OUT_Y = 24;
/** Ember `i` starts at 700 + 230·i with a period of 2200 + 350·(i % 4). */
const BIRTH = { first: 700, step: 230 } as const;
const PERIOD = { base: 2200, step: 350 } as const;
const RISE = { base: 130, step: 22 } as const;
const WOBBLE = 7;
const DRIFT = { base: 10, step: 6 } as const;
const FROM_FIRE = 8;
const PEAK_OPACITY = 0.9;
const SIZE = { base: 3, step: 1 } as const;
const HALO_OPACITY = 0.75;
/** The puff: 8 embers fanning up over 1.1 s, 40 ms apart. */
const PUFF = {
	fan: 0.28,
	life: 1100,
	reachBase: 40,
	reachMore: 90,
	reachStep: 14,
	step: 40,
	tall: 1.2,
};
const PUFF_ABOVE = 6;
/** The ring of sparks leaves the count over 60–620 ms after the roll. */
const RING_T = { from: 60, to: 620 } as const;
const RING_SHRINK = 0.6;

type Look = { core: string; halo: string; blur: number };

function dot(
	c: SkCanvas,
	x: number,
	y: number,
	r: number,
	o: number,
	look: Look
) {
	"worklet";
	const glow = Skia.Paint();
	glow.setAntiAlias(true);
	glow.setColor(Skia.Color(look.halo));
	glow.setAlphaf(o * HALO_OPACITY);
	glow.setMaskFilter(
		Skia.MaskFilter.MakeBlur(BlurStyle.Normal, look.blur, true)
	);
	c.drawCircle(x, y, r + 1, glow);
	const p = Skia.Paint();
	p.setAntiAlias(true);
	p.setColor(Skia.Color(look.core));
	p.setAlphaf(o);
	c.drawCircle(x, y, r, p);
}

function rising(c: SkCanvas, g: Geo, m: number, fade: number, look: Look) {
	"worklet";
	for (let i = 0; i < NE; i++) {
		const per = PERIOD.base + (i % 4) * PERIOD.step;
		const since = m - (BIRTH.first + i * BIRTH.step);
		if (since < 0) {
			continue;
		}
		const n = Math.floor(since / per);
		if (BIRTH.first + i * BIRTH.step + n * per > EMBERS_UNTIL) {
			continue;
		}
		const p = (since - n * per) / per;
		const x =
			g.fx +
			Math.sin(p * TAU + i) * WOBBLE +
			(i % 2 ? 1 : -1) * p * (DRIFT.base + (i % 3) * DRIFT.step);
		const y = g.fy - FROM_FIRE - p * (RISE.base + (i % 4) * RISE.step);
		const size = SIZE.base + (i % 3) * SIZE.step;
		dot(c, x, y, size / 2, Math.sin(Math.PI * p) * PEAK_OPACITY * fade, look);
	}
}

function puff(c: SkCanvas, g: Geo, since: number, fade: number, look: Look) {
	"worklet";
	for (let i = 0; i < NP; i++) {
		const p = seg(since, i * PUFF.step, i * PUFF.step + PUFF.life);
		if (p <= 0 || p >= 1) {
			continue;
		}
		const a = -Math.PI / 2 + (i - (NP - 1) / 2) * PUFF.fan;
		const r =
			PUFF.reachBase + PUFF.reachMore * easeOut(p) + (i % 3) * PUFF.reachStep;
		const size = SIZE.base + (i % 2) * 2;
		dot(
			c,
			g.fx + Math.cos(a) * r,
			g.fy - PUFF_ABOVE + Math.sin(a) * r * PUFF.tall,
			size / 2,
			(1 - p) * fade,
			look
		);
	}
}

function ring(c: SkCanvas, g: Geo, m: number, fade: number) {
	"worklet";
	const p = seg(m, T.roll + RING_T.from, T.roll + RING_T.to);
	if (p <= 0 || p >= 1) {
		return;
	}
	const paint = Skia.Paint();
	paint.setAntiAlias(true);
	for (const s of RING) {
		paint.setColor(Skia.Color(s.col));
		paint.setAlphaf((1 - p * p) * fade);
		c.drawCircle(
			g.cx + s.dx * easeOut(p),
			g.cy + s.dy * easeOut(p),
			(s.s / 2) * (1 - RING_SHRINK * p),
			paint
		);
	}
}

function draw(c: SkCanvas, e: Eng, g: Geo, look: Look) {
	"worklet";
	if (e.rm) {
		return;
	}
	const o = outAt(e);
	if (o >= 1) {
		return;
	}
	const m = age(e, e.tm);
	c.save();
	c.translate(0, liftAt(m, e.rm) + OUT_Y * o);
	const fade = 1 - o;
	rising(c, g, m, fade, look);
	const since = age(e, e.tp);
	if (since >= 0) {
		puff(c, g, since, fade, look);
	}
	ring(c, g, m, fade);
	c.restore();
}

/**
 * The embers rising from the fire (10, none born after 7.6 s), the ring of
 * sparks leaving the count, and the puff when Flux is tapped: points in one Skia
 * picture, re-recorded from the engine. The canvas stays still; the lift and
 * the milestone stepping aside are applied as it draws.
 */
export function Embers({
	eng,
	geo,
	dark,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	dark: boolean;
}) {
	const look = dark ? EMBER.dusk : EMBER.day;
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, geo.W, geo.H));
		draw(c, eng.get(), geo, look);
		return rec.finishRecordingAsPicture();
	});
	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Picture picture={picture} />
		</Canvas>
	);
}
