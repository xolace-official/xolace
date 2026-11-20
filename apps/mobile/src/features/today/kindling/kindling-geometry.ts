import { Skia, type SkPath } from "@shopify/react-native-skia";
import { cubicBetween, nodesFor, PATH_W } from "./kindling-model";

const SAMPLES = 48;
export type Table = { xs: number[]; ys: number[]; len: number };
export type PathGeometry = {
	nodes: [number, number][];
	paths: SkPath[];
	tables: Table[];
};

function flatten(path: SkPath): Table {
	const contour = Skia.ContourMeasureIter(path, false, 1).next();
	const xs: number[] = [];
	const ys: number[] = [];
	const len = contour?.length() ?? 0;
	for (let i = 0; i <= SAMPLES; i += 1) {
		const p = contour ? contour.getPosTan((len * i) / SAMPLES)[0] : null;
		xs.push(p?.x ?? 0);
		ys.push(p?.y ?? 0);
	}
	return { len, xs, ys };
}

const cache = new Map<string, PathGeometry>();
export function pathGeometry(width: number, count: number): PathGeometry {
	const sx = Math.round((width / PATH_W) * 1000) / 1000;
	const key = `${sx}:${count}`;
	const hit = cache.get(key);
	if (hit) {
		return hit;
	}
	const nodes = nodesFor(count).map(
		([x, y]) => [x * sx, y] as [number, number]
	);
	const paths = nodes.slice(1).map((b, i) => {
		const a = nodes[i] ?? b;
		const [p0, c1, c2, p1] = cubicBetween(a, b);
		const builder = Skia.PathBuilder.Make();
		if (p0 && c1 && c2 && p1) {
			builder
				.moveTo(p0[0], p0[1])
				.cubicTo(c1[0], c1[1], c2[0], c2[1], p1[0], p1[1]);
		}
		return builder.build();
	});
	const geo = { nodes, paths, tables: paths.map(flatten) };
	cache.set(key, geo);
	return geo;
}

export function alongX(t: Table | undefined, u: number) {
	"worklet";
	if (!t) {
		return 0;
	}
	const f = Math.min(1, Math.max(0, u)) * SAMPLES;
	const i = Math.min(SAMPLES - 1, Math.floor(f));
	return (t.xs[i] ?? 0) + ((t.xs[i + 1] ?? 0) - (t.xs[i] ?? 0)) * (f - i);
}
export function alongY(t: Table | undefined, u: number) {
	"worklet";
	if (!t) {
		return 0;
	}
	const f = Math.min(1, Math.max(0, u)) * SAMPLES;
	const i = Math.min(SAMPLES - 1, Math.floor(f));
	return (t.ys[i] ?? 0) + ((t.ys[i + 1] ?? 0) - (t.ys[i] ?? 0)) * (f - i);
}
