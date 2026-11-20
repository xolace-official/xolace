import {
	FilterMode,
	MipmapMode,
	type SkCanvas,
	type SkImage,
	Skia,
	type SkRuntimeEffect,
	TileMode,
} from "@shopify/react-native-skia";
import { PHASE } from "@/features/vent/field/field-control";
import { burnEnd, type FieldState } from "@/features/vent/field/field-step";
import { drawAfter, drawAsh } from "@/features/vent/field/particle-after";
import {
	type Batch,
	flush,
	newBatch,
} from "@/features/vent/field/particle-atlas";
import { drawBurn, explodeAt } from "@/features/vent/field/particle-burn";
import {
	AFTER_LEAD_MS,
	RM_FADE_MS,
	SCATTER_MS,
} from "@/features/vent/field/particle-config";
import {
	drawField,
	drawSparse,
	type Stage,
} from "@/features/vent/field/particle-render";
import { thresholdAt, WORD_BURN_MS } from "@/features/vent/words/burn-shader";
import type { WordLayer } from "@/features/vent/words/word-layer";

function drawWords(
	canvas: SkCanvas,
	L: WordLayer,
	fx: SkRuntimeEffect,
	ms: number
) {
	"worklet";
	const m = Skia.Matrix();
	m.translate(L.x0, L.y0);
	m.scale(1 / L.scale, 1 / L.scale);
	const text = L.image.makeShaderOptions(
		TileMode.Decal,
		TileMode.Decal,
		FilterMode.Linear,
		MipmapMode.None,
		m
	);
	const p = Skia.Paint();
	p.setShader(
		fx.makeShaderWithChildren(
			[L.x0, L.y0, L.bw, L.bh, L.top, L.lineH, L.lines, thresholdAt(ms)],
			[text]
		)
	);
	canvas.drawRect(Skia.XYWHRect(L.x0, L.y0, L.bw, L.bh), p);
}

export function paintFrame(
	canvas: SkCanvas,
	img: SkImage,
	s: FieldState,
	st: Stage,
	rm: boolean,
	L: WordLayer | null,
	fx: SkRuntimeEffect | null
) {
	"worklet";
	const b: Batch = newBatch();
	const t = s.spin;
	const ph = s.phase;
	if (ph === PHASE.sparse) {
		drawSparse(b, st, t);
	}
	if (ph === PHASE.field || ph === PHASE.rec) {
		drawField(b, st, {
			end: s.end,
			et: s.now - s.enter0,
			fade: 1,
			fromSparse: s.fromSparse,
			r: s.r,
			rm,
			t,
			w: s.w,
		});
	}
	if (ph === PHASE.burn) {
		const bt = s.now - s.start;
		if (bt <= burnEnd(s, rm)) {
			drawBurn(canvas, b, st, {
				bt,
				flx: s.flx,
				fly: s.fly,
				r0: s.r0,
				rm,
				skip: s.skip,
				t,
				w0: s.w0,
			});
		}
		const ag = rm ? RM_FADE_MS : explodeAt(s.skip) + SCATTER_MS - AFTER_LEAD_MS;
		if (bt > ag) {
			drawAfter(b, st, bt - ag);
		}
	}
	if (ph === PHASE.ash && L && s.ash0 >= 0) {
		const ms = s.now - s.ash0;
		if (fx && ms < WORD_BURN_MS) {
			drawWords(canvas, L, fx, ms);
		}
		drawAsh(b, L.ash, ms);
	}
	flush(canvas, img, b);
}
