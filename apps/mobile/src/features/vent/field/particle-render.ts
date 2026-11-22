import { BlurStyle, type SkCanvas, Skia } from "@shopify/react-native-skia";
import { type Batch, dot } from "@/features/vent/field/particle-atlas";
import {
	ASSEMBLY_MS,
	COMPRESS_MS,
	DELAY,
	DIR_X,
	DIR_Y,
	DIR_Z,
	ENTRY_X,
	ENTRY_Y,
	FROM_SPARSE,
	PARTICLE_COUNT,
	PERSPECTIVE,
	PHASE0,
	PULSE_MS,
	RM_ENTER_MS,
	SIZE,
	SPARSE_COUNT,
	SPEED,
} from "@/features/vent/field/particle-config";

const FLASH_BLUR = 26;

export type Stage = { cx: number; cy: number; w: number; h: number };

const clamp01 = (v: number) => {
	"worklet";
	return v < 0 ? 0 : v > 1 ? 1 : v;
};

export { clamp01 };

export function orbit(i: number, t: number) {
	"worklet";
	const rot = t * 0.0003 * SPEED[i] + PHASE0[i];
	const c = Math.cos(rot);
	const s = Math.sin(rot);
	return {
		x: DIR_X[i] * c - DIR_Z[i] * s,
		y: DIR_Y[i] + Math.sin(t * 0.001 + PHASE0[i]) * 0.05,
		z: DIR_X[i] * s + DIR_Z[i] * c,
	};
}

export function drawSparse(b: Batch, st: Stage, t: number) {
	"worklet";
	const r = Math.min(st.w, st.h) * 0.42;
	for (let i = 0; i < SPARSE_COUNT; i++) {
		const p = orbit(i, t * 0.3);
		const sc = PERSPECTIVE / (PERSPECTIVE + p.z * r);
		dot(
			b,
			st.cx + p.x * r * sc,
			st.cy + p.y * r * sc,
			SIZE[i] * sc,
			0,
			0.12 + 0.08 * ((1 - p.z) / 2)
		);
	}
}

export type FieldOpts = {
	t: number;
	et: number;
	r: number;
	w: number;
	end: number;
	rm: boolean;
	fromSparse: boolean;
	fade: number;
};

export function drawField(b: Batch, st: Stage, o: FieldOpts) {
	"worklet";
	const ed = Math.max(st.w, st.h) * 0.7 * (o.fromSparse ? FROM_SPARSE : 1);
	let pulse = 1;
	if (!o.rm && o.et > ASSEMBLY_MS && o.et < ASSEMBLY_MS + PULSE_MS) {
		pulse = 1 + 0.08 * Math.sin((Math.PI * (o.et - ASSEMBLY_MS)) / PULSE_MS);
	}
	const r = o.r * pulse;
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		const p = orbit(i, o.rm ? 0 : o.t);
		const sc = PERSPECTIVE / (PERSPECTIVE + p.z * r);
		let x = st.cx + p.x * r * sc;
		let y = st.cy + p.y * r * sc;
		let a = 1;
		if (o.rm) {
			a = clamp01(o.et / RM_ENTER_MS);
		} else {
			const raw = (o.et - DELAY[i]) / ASSEMBLY_MS;
			const k = raw <= 0 ? 0 : raw >= 1 ? 1 : 1 - (1 - raw) ** 3;
			if (k < 1) {
				const ex = st.cx + ENTRY_X[i] * ed;
				const ey = st.cy + ENTRY_Y[i] * ed;
				x = ex + (x - ex) * k;
				y = ey + (y - ey) * k;
			}
			a = k;
		}
		const near = (1 - p.z) / 2;
		const cen = 1 - Math.min(1, Math.sqrt(p.x * p.x + p.y * p.y));
		const tw = o.rm ? 1 : 1 + 0.15 * Math.sin(o.t * 0.004 + PHASE0[i] * 7);
		let warm = o.w * (0.35 + 1.25 * cen);
		if (o.end > 0) {
			warm = Math.max(warm, o.end * (1.15 - 1.3 * cen));
			a *= 1 + 0.35 * o.end * (1 - cen);
		}
		dot(b, x, y, SIZE[i] * sc * tw, warm, a * (0.3 + 0.7 * near) * o.fade);
	}
}

export function drawGather(
	b: Batch,
	st: Stage,
	t: number,
	bt: number,
	r0: number,
	w0: number
) {
	"worklet";
	const raw = bt / COMPRESS_MS;
	const p = raw * raw * raw;
	const r = r0 * (1 - p) + 8 * p;
	const warm = w0 + (1 - w0) * p;
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		const q = orbit(i, t);
		const sc = PERSPECTIVE / (PERSPECTIVE + q.z * r);
		const cen = 1 - Math.min(1, Math.sqrt(q.x * q.x + q.y * q.y));
		dot(
			b,
			st.cx + q.x * r * sc,
			st.cy + q.y * r * sc,
			SIZE[i] * sc,
			warm * (0.35 + 1.25 * cen),
			0.9
		);
	}
}

export function drawFlash(
	canvas: SkCanvas,
	st: Stage,
	te: number,
	alpha: number,
	color: string
) {
	"worklet";
	const paint = Skia.Paint();
	paint.setColor(Skia.Color(color));
	paint.setMaskFilter(
		Skia.MaskFilter.MakeBlur(BlurStyle.Normal, FLASH_BLUR, true)
	);
	paint.setAlphaf(alpha);
	canvas.drawCircle(st.cx, st.cy, 70 + te * 0.4, paint);
}
