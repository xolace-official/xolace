import { Skia, type SkPath } from "@shopify/react-native-skia";

// Card silhouettes for the founder-message marquee (#264, direction #236).
// Constraint from the direction review: no shape may eat the photo — no pointed
// ovals, no crescents. One card per shape, no duplicates. Five shapes, five cards.

export type FounderCardShape =
	| "circle"
	| "roundedRect"
	| "portal"
	| "blob"
	| "flower";

const IMAGE_CORNER_RADIUS = 20;
const FLOWER_LOBE_STEPS = 108; // 12×9 — even point density per lobe

/** Inscribed circle filling the inner rect. */
const circlePath = (w: number, h: number): SkPath => {
	const p = Skia.PathBuilder.Make();
	p.addCircle(w / 2, h / 2, Math.min(w, h) / 2);
	return p.build();
};

/** Soft rounded rectangle. */
const roundedRectPath = (w: number, h: number): SkPath => {
	const p = Skia.PathBuilder.Make();
	const r = Math.min(IMAGE_CORNER_RADIUS, w / 2, h / 2);
	p.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), r, r));
	return p.build();
};

/** Doorway / portal: rounded arch on top, straight jambs, softly rounded base. */
const portalPath = (w: number, h: number): SkPath => {
	const p = Skia.PathBuilder.Make();
	const arch = Math.min(w / 2, h * 0.5);
	const base = h * 0.12;
	p.moveTo(0, h - base);
	p.lineTo(0, arch);
	p.quadTo(0, 0, w / 2, 0);
	p.quadTo(w, 0, w, arch);
	p.lineTo(w, h - base);
	p.quadTo(w, h, w - base, h);
	p.lineTo(base, h);
	p.quadTo(0, h, 0, h - base);
	p.close();
	return p.build();
};

/** Organic squircle — a slightly lopsided soft blob, no two corners alike. */
const blobPath = (w: number, h: number): SkPath => {
	const p = Skia.PathBuilder.Make();
	p.moveTo(w * 0.5, h * 0.02);
	p.cubicTo(w * 0.9, h * -0.02, w * 1.04, h * 0.42, w * 0.96, h * 0.62);
	p.cubicTo(w * 0.88, h * 0.9, w * 0.55, h * 1.03, w * 0.34, h * 0.97);
	p.cubicTo(w * 0.06, h * 0.88, w * -0.04, h * 0.5, w * 0.05, h * 0.3);
	p.cubicTo(w * 0.12, h * 0.1, w * 0.28, h * 0.05, w * 0.5, h * 0.02);
	p.close();
	return p.build();
};

/** Scalloped rose — nine shallow lobes, kept shallow so the photo stays readable. */
const flowerPath = (w: number, h: number): SkPath => {
	const p = Skia.PathBuilder.Make();
	const cx = w / 2;
	const cy = h / 2;
	const rw = w / 2;
	const rh = h / 2;
	const lobeCount = 9;
	const amplitude = 0.18;
	const baseRadius = 0.84;
	for (let step = 0; step <= FLOWER_LOBE_STEPS; step += 1) {
		const t = (step / FLOWER_LOBE_STEPS) * Math.PI * 2;
		const rf = baseRadius + (amplitude * (1 + Math.cos(lobeCount * t))) / 2;
		const x = cx + rw * rf * Math.cos(t);
		const y = cy + rh * rf * Math.sin(t);
		if (step === 0) {
			p.moveTo(x, y);
		} else {
			p.lineTo(x, y);
		}
	}
	p.close();
	return p.build();
};

export const createFounderClipPath = (
	shape: FounderCardShape,
	width: number,
	height: number
): SkPath => {
	if (width <= 0 || height <= 0) {
		return Skia.Path.Make();
	}
	switch (shape) {
		case "circle":
			return circlePath(width, height);
		case "roundedRect":
			return roundedRectPath(width, height);
		case "portal":
			return portalPath(width, height);
		case "blob":
			return blobPath(width, height);
		case "flower":
			return flowerPath(width, height);
	}
};
