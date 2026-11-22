import {
	Canvas,
	Picture,
	type SkCanvas,
	Skia,
	type SkPaint,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import {
	age,
	type Eng,
	type Geo,
	PH,
	PIECES,
} from "@/features/achievements/arrival/arrival-motion";
import { clamp, easeOut, seg } from "@/features/achievements/motion-math";

const FALL_END = 0.92;
const FALL_FROM = 900;
const BURST_STEP = 12;
const BURST_OUT = 900;
const BURST_DROP = 650;
const BURST_FADE = { from: 2800, to: 3500 } as const;
const ARC_Y = 1.15;
const GRAVITY = 300;
const DRIFT = 40;
const SWAY = { amp: 10, period: 380, ramp: 1.6 } as const;
const GROW = { from: 0.3, over: 1.6 } as const;
const FADE_IN = 5;
const BELOW_SCREEN = 16;
const FALL_ABOVE = 20;
const FALL_PAST = 36;
const FALL_EASE = 1.4;
const FALL_WAVES = 3;
const CORNER = 2;
const VISIBLE = 0.004;

function piece(
	c: SkCanvas,
	paint: SkPaint,
	p: { col: string; round: boolean; w: number; h: number }
) {
	"worklet";
	paint.setColor(Skia.Color(p.col));
	if (p.round) {
		c.drawCircle(0, 0, p.w / 2, paint);
	} else {
		c.drawRRect(
			Skia.RRectXY(Skia.XYWHRect(-p.w / 2, -p.h / 2, p.w, p.h), CORNER, CORNER),
			paint
		);
	}
}

function burst(
	c: SkCanvas,
	paint: SkPaint,
	p: (typeof PIECES)[number],
	u0: number,
	g: Geo
) {
	"worklet";
	const u = u0 - p.i * BURST_STEP;
	if (u <= 0) {
		return;
	}
	const out = easeOut(seg(u, 0, BURST_OUT));
	const fall = Math.max(0, u - BURST_DROP) / 1000;
	const x =
		g.cx +
		Math.cos(p.ang) * p.rad * out +
		Math.sin(u / SWAY.period + p.i) * SWAY.amp * clamp(fall * SWAY.ramp);
	const y =
		g.hy +
		Math.sin(p.ang) * p.rad * ARC_Y * out +
		GRAVITY * fall * fall +
		DRIFT * fall;
	const o =
		Math.min(1, out * FADE_IN) *
		(1 - seg(u, BURST_FADE.from, BURST_FADE.to)) *
		(y > g.H + BELOW_SCREEN ? 0 : 1);
	if (o <= VISIBLE) {
		return;
	}
	const sz = GROW.from + (1 - GROW.from) * Math.min(1, out * GROW.over);
	paint.setAlphaf(o);
	c.save();
	c.translate(x, y);
	c.rotate((p.spin * u) / 1000, 0, 0);
	c.scale(sz, sz * Math.cos((u / 1000) * p.flut + p.i));
	piece(c, paint, p);
	c.restore();
}

function fall(
	c: SkCanvas,
	paint: SkPaint,
	p: (typeof PIECES)[number],
	a: number,
	g: Geo
) {
	"worklet";
	const v = a - FALL_FROM - p.delay;
	if (v <= 0 || v >= p.dur) {
		return;
	}
	const q = v / p.dur;
	if (q >= FALL_END) {
		return;
	}
	const down = 1 - (1 - q) ** FALL_EASE;
	const x = p.x0 * g.W + Math.sin(q * Math.PI * FALL_WAVES + p.i) * p.sway;
	const y = -FALL_ABOVE + down * (g.H + FALL_PAST);
	paint.setAlphaf(1);
	c.save();
	c.translate(x + p.w / 2, y + p.h / 2);
	c.rotate(q * p.spin, 0, 0);
	c.scale(1, Math.cos(q * p.flut * FALL_WAVES + p.i));
	piece(c, paint, p);
	c.restore();
}

function draw(c: SkCanvas, e: Eng, g: Geo, front: boolean) {
	"worklet";
	if (e.rm || e.phase !== PH.badge) {
		return;
	}
	const paint = Skia.Paint();
	paint.setAntiAlias(true);
	const a = age(e, e.ta);
	const u0 = age(e, e.tu);
	for (const p of PIECES) {
		if (p.front !== front) {
			continue;
		}
		if (p.burst) {
			if (u0 >= 0) {
				burst(c, paint, p, u0, g);
			}
		} else if (e.rain && a >= 0) {
			fall(c, paint, p, a, g);
		}
	}
}

export function Confetti({
	eng,
	geo,
	front,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	front: boolean;
}) {
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, geo.W, geo.H));
		draw(c, eng.get(), geo, front);
		return rec.finishRecordingAsPicture();
	});
	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Picture picture={picture} />
		</Canvas>
	);
}
