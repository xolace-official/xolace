import { PaintStyle, type SkCanvas, Skia } from "@shopify/react-native-skia";
import { type Batch, dot } from "@/features/vent/field/particle-atlas";
import {
	COMPRESS_MS,
	FLAKE,
	FLAKE_EXTRA_MS,
	FLASH_MS,
	PARTICLE_COUNT,
	PHASE0,
	RING_MS,
	RM_FADE_MS,
	SCAT_G,
	SCAT_VX,
	SCAT_VY,
	SCATTER_MS,
	SIZE,
} from "@/features/vent/field/particle-config";
import {
	clamp01,
	drawField,
	drawFlash,
	drawGather,
	orbit,
	type Stage,
} from "@/features/vent/field/particle-render";
import { VENT_COLORS } from "@/features/vent/vent-palette";

export type BurnOpts = {
	t: number;
	bt: number;
	r0: number;
	w0: number;
	skip: number;
	flx: number;
	fly: number;
	rm: boolean;
};

const FLASH_COLOR = VENT_COLORS.flash;
const RING_COLOR = VENT_COLORS.ring;
const TRAIL = [
	[26, 0.34, 0.82],
	[52, 0.16, 0.7],
] as const;
const TRAIL_FROM_MS = 50;

export const explodeAt = (skip: number) => {
	"worklet";
	return skip >= 0 ? skip : COMPRESS_MS;
};

function drawRing(canvas: SkCanvas, st: Stage, k: number) {
	"worklet";
	const e3 = 1 - (1 - k) ** 3;
	const paint = Skia.Paint();
	paint.setColor(Skia.Color(RING_COLOR));
	paint.setStyle(PaintStyle.Stroke);
	paint.setStrokeWidth(1 + 2.5 * (1 - k));
	paint.setAntiAlias(true);
	paint.setAlphaf(0.22 * (1 - k) ** 1.5);
	canvas.drawCircle(st.cx, st.cy, 24 + 236 * e3, paint);
}

export function drawBurn(canvas: SkCanvas, b: Batch, st: Stage, o: BurnOpts) {
	"worklet";
	if (o.rm) {
		const k = clamp01(o.bt / RM_FADE_MS);
		drawField(b, st, {
			end: 0,
			et: 1e6,
			fade: 1 - k,
			fromSparse: false,
			r: o.r0 * (1 - 0.1 * k),
			rm: true,
			t: o.t,
			w: o.w0 + (1 - o.w0) * k,
		});
		return;
	}
	const ex = explodeAt(o.skip);
	if (o.bt < ex) {
		drawGather(b, st, o.t, o.bt, o.r0, o.w0);
		return;
	}
	const te = o.bt - ex;
	if (te < FLASH_MS) {
		drawFlash(canvas, st, te, 1 - te / FLASH_MS, FLASH_COLOR);
	}
	if (te < RING_MS) {
		drawRing(canvas, st, te / RING_MS);
	}
	const t0 = o.t - te;
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		const q = orbit(i, t0);
		const ox = st.cx + q.x * 8;
		const oy = st.cy + q.y * 8;
		if (FLAKE[i]) {
			const life = SCATTER_MS + FLAKE_EXTRA_MS;
			if (te >= life) {
				continue;
			}
			const x =
				ox +
				SCAT_VX[i] * 0.45 * te +
				Math.sin(te * 0.0035 + PHASE0[i]) * 7 +
				o.flx * te * 0.09;
			const y = oy + (SCAT_VY[i] * 0.45 - 0.035) * te + o.fly * te * 0.09;
			dot(
				b,
				x,
				y,
				SIZE[i] * 0.85,
				1 - clamp01(te / 700),
				0.85 * (1 - te / life)
			);
			continue;
		}
		if (te >= SCATTER_MS) {
			continue;
		}
		const fade = 1 - te / SCATTER_MS;
		const warm = 1 - clamp01(te / 1500) * 0.82;
		const s = SIZE[i] * (1 - te / (SCATTER_MS * 2));
		if (te > TRAIL_FROM_MS) {
			for (let k = TRAIL.length - 1; k >= 0; k--) {
				const tt = te - TRAIL[k][0];
				const x = ox + SCAT_VX[i] * tt + o.flx * tt * 0.2;
				const y =
					oy + SCAT_VY[i] * tt + 0.5 * SCAT_G[i] * tt * tt + o.fly * tt * 0.2;
				dot(b, x, y, s * TRAIL[k][2], warm, fade * TRAIL[k][1]);
			}
		}
		const x = ox + SCAT_VX[i] * te + o.flx * te * 0.2;
		const y =
			oy + SCAT_VY[i] * te + 0.5 * SCAT_G[i] * te * te + o.fly * te * 0.2;
		dot(b, x, y, s, warm, fade * 0.95);
	}
}
