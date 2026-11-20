import { type SkImage, Skia, type SkPoint } from "@shopify/react-native-skia";
import { ENSO } from "../motion";
import { PAPER_SKSL } from "./enso-shader";

const MARGIN = 1.7;
const MAX_STROKES = 8;
const RX = 0.35;
const RY = 0.34;
const HALF = 0.025;
const DRY_END = 0.3;
const DEG = Math.PI / 180;
const N = 150;

export type Stroke = { xs: number[]; ys: number[]; hw: number[]; dry: number };
export type Mesh = {
	vertices: SkPoint[];
	textures: SkPoint[];
	indices: number[];
};
export type Plan = {
	starts: number[];
	lengths: number[];
	dry: number[];
	caps: number[];
	ends: number[];
	length: number;
};

function ellipseAt(size: number, out: number, s: number) {
	const a = (ENSO.startDeg + ENSO.sweepDeg * s) * DEG;
	const c = size / 2;
	return {
		x: c + Math.cos(a) * (size * RX + out),
		y: c + Math.sin(a) * (size * RY + out),
	};
}

function ensoStroke(size: number): Stroke {
	const xs: number[] = [];
	const ys: number[] = [];
	const hw: number[] = [];
	for (let i = 0; i < N; i += 1) {
		const s = i / (N - 1);
		const p = ellipseAt(size, 0, s);
		xs.push(p.x);
		ys.push(p.y);
		const blot = 1 + 0.6 * Math.exp(-((s - 0.012) * (s - 0.012)) / 0.0005);
		const body =
			1.06 +
			0.05 * Math.sin(Math.PI * Math.min(1, s * 1.5)) +
			0.02 * Math.sin(s * 23);
		hw.push(size * HALF * blot * body);
	}
	return { dry: DRY_END, hw, xs, ys };
}

export function ensoGuide(size: number, out: number) {
	const b = Skia.PathBuilder.Make();
	for (let i = 0; i < N; i += 1) {
		const p = ellipseAt(size, out, i / (N - 1));
		if (i === 0) {
			b.moveTo(p.x, p.y);
		} else {
			b.lineTo(p.x, p.y);
		}
	}
	return b.build();
}

function plan(s: Stroke): Plan {
	let L = 0;
	for (let i = 1; i < s.xs.length; i += 1) {
		L += Math.hypot(s.xs[i] - s.xs[i - 1], s.ys[i] - s.ys[i - 1]);
	}
	const pad = (v: number) => [
		v,
		...new Array<number>(MAX_STROKES - 1).fill(v === 0 ? 1e6 : 1),
	];
	return {
		caps: pad(s.hw[0] * 1.2),
		dry: [s.dry, ...new Array<number>(MAX_STROKES - 1).fill(0)],
		ends: pad(s.hw[s.hw.length - 1] * 1.2),
		length: L,
		lengths: pad(L),
		starts: [0, ...new Array<number>(MAX_STROKES - 1).fill(1e6)],
	};
}

function addStroke(
	mesh: Mesh,
	s: Stroke,
	index: number,
	start: number,
	margin: number
) {
	const n = s.xs.length;
	if (n < 2) {
		return;
	}
	const base = mesh.vertices.length;
	const unit = (ax: number, ay: number, bx: number, by: number) =>
		Math.hypot(bx - ax, by - ay) || 1;
	const d0 = unit(s.xs[0], s.ys[0], s.xs[1], s.ys[1]);
	const d1 = unit(s.xs[n - 2], s.ys[n - 2], s.xs[n - 1], s.ys[n - 1]);
	const sx = s.xs[0] - ((s.xs[1] - s.xs[0]) / d0) * s.hw[0] * 1.2;
	const sy = s.ys[0] - ((s.ys[1] - s.ys[0]) / d0) * s.hw[0] * 1.2;
	const ex =
		s.xs[n - 1] + ((s.xs[n - 1] - s.xs[n - 2]) / d1) * s.hw[n - 1] * 1.2;
	const ey =
		s.ys[n - 1] + ((s.ys[n - 1] - s.ys[n - 2]) / d1) * s.hw[n - 1] * 1.2;
	const xs = [sx, ...s.xs, ex];
	const ys = [sy, ...s.ys, ey];
	const hw = [s.hw[0], ...s.hw, s.hw[n - 1]];
	let along = start - s.hw[0] * 1.2;
	for (let i = 0; i < xs.length; i += 1) {
		if (i > 0) {
			along += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
		}
		const a = Math.max(0, i - 1);
		const b = Math.min(xs.length - 1, i + 1);
		let tx = xs[b] - xs[a];
		let ty = ys[b] - ys[a];
		const tl = Math.hypot(tx, ty) || 1;
		tx /= tl;
		ty /= tl;
		const off = hw[i] * margin;
		mesh.vertices.push({ x: xs[i] - ty * off, y: ys[i] + tx * off });
		mesh.vertices.push({ x: xs[i] + ty * off, y: ys[i] - tx * off });
		mesh.textures.push({ x: along, y: -margin + 4 * index });
		mesh.textures.push({ x: along, y: margin + 4 * index });
		if (i > 0) {
			const p = base + (i - 1) * 2;
			mesh.indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
		}
	}
}

export function buildEnso(size: number) {
	const stroke = ensoStroke(size);
	const p = plan(stroke);
	const mesh: Mesh = { indices: [], textures: [], vertices: [] };
	addStroke(mesh, stroke, 0, 0, MARGIN);
	return { mesh, plan: p, start: { x: stroke.xs[0], y: stroke.ys[0] }, stroke };
}

const paperEffect = Skia.RuntimeEffect.Make(PAPER_SKSL);

export function bakePaper(
	width: number,
	height: number,
	scale: number
): SkImage | null {
	if (!paperEffect) {
		return null;
	}
	const surface = Skia.Surface.MakeOffscreen(
		Math.ceil(width * scale),
		Math.ceil(height * scale)
	);
	if (!surface) {
		return null;
	}
	const canvas = surface.getCanvas();
	canvas.scale(scale, scale);
	const paint = Skia.Paint();
	paint.setShader(paperEffect.makeShader([width, height]));
	canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
	surface.flush();
	const image = surface.makeImageSnapshot();
	return image.makeNonTextureImage() ?? image;
}
