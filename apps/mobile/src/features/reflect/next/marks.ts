import { Skia, type SkPath } from "@shopify/react-native-skia";
import { ARC, arcsAt, type Box, type Corners } from "@/design/breath-arc";

/**
 * The three Where next marks (board tile paths, 44 × 44), built with four-elements-class-picker's
 * `markBuilder` (S13), ported to Skia 2.14's immutable paths: a PathBuilder, plus the block's 24
 * samples per cubic and its 128-entry arc-length table, so a tip can move at even speed.
 */
export type Point = { x: number; y: number };
export type Mark = { path: SkPath; lookup: Point[]; svg: string };

const SAMPLES = 24;
const TABLE = 128;
const KAPPA = 0.552_284_749_8;

function markBuilder() {
	const b = Skia.PathBuilder.Make();
	const points: Point[] = [];
	const distances: number[] = [];
	let length = 0;
	let current = { x: 0, y: 0 };
	const move = (x: number, y: number) => {
		current = { x, y };
		b.moveTo(x, y);
		points.push(current);
		distances.push(length);
	};
	const curve = (
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x: number,
		y: number
	) => {
		const start = current;
		b.cubicTo(x1, y1, x2, y2, x, y);
		for (let step = 1; step <= SAMPLES; step++) {
			const u = step / SAMPLES;
			const v = 1 - u;
			const p = {
				x:
					v ** 3 * start.x +
					3 * v * v * u * x1 +
					3 * v * u * u * x2 +
					u ** 3 * x,
				y:
					v ** 3 * start.y +
					3 * v * v * u * y1 +
					3 * v * u * u * y2 +
					u ** 3 * y,
			};
			length += Math.hypot(p.x - current.x, p.y - current.y);
			points.push(p);
			distances.push(length);
			current = p;
		}
	};
	const circle = (x: number, y: number, r: number) => {
		const k = r * KAPPA;
		move(x, y - r);
		curve(x + k, y - r, x + r, y - k, x + r, y);
		curve(x + r, y + k, x + k, y + r, x, y + r);
		curve(x - k, y + r, x - r, y + k, x - r, y);
		curve(x - r, y - k, x - k, y - r, x, y - r);
	};
	/** An elliptical arc as cubics, ≤ 90° each (the board's last mark is one SVG arc). */
	const arc = (
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		fromDeg: number,
		sweepDeg: number
	) => {
		const n = Math.ceil(Math.abs(sweepDeg) / 90);
		const step = ((sweepDeg / n) * Math.PI) / 180;
		let a = (fromDeg * Math.PI) / 180;
		move(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
		const k = (4 / 3) * Math.tan(step / 4);
		for (let i = 0; i < n; i++) {
			const b2 = a + step;
			curve(
				cx + rx * (Math.cos(a) - k * Math.sin(a)),
				cy + ry * (Math.sin(a) + k * Math.cos(a)),
				cx + rx * (Math.cos(b2) + k * Math.sin(b2)),
				cy + ry * (Math.sin(b2) - k * Math.cos(b2)),
				cx + rx * Math.cos(b2),
				cy + ry * Math.sin(b2)
			);
			a = b2;
		}
	};
	const line = (x: number, y: number) => {
		const a = current;
		curve(
			a.x + (x - a.x) / 3,
			a.y + (y - a.y) / 3,
			a.x + ((x - a.x) * 2) / 3,
			a.y + ((y - a.y) * 2) / 3,
			x,
			y
		);
	};
	const finish = (svg: string): Mark => {
		let cursor = 1;
		const lookup: Point[] = [];
		for (let step = 0; step < TABLE; step++) {
			const wanted = (step / (TABLE - 1)) * length;
			while (cursor < distances.length - 1 && distances[cursor] < wanted) {
				cursor++;
			}
			const previous = Math.max(0, cursor - 1);
			const span = distances[cursor] - distances[previous];
			const u = span > 0 ? (wanted - distances[previous]) / span : 1;
			lookup.push({
				x: points[previous].x + (points[cursor].x - points[previous].x) * u,
				y: points[previous].y + (points[cursor].y - points[previous].y) * u,
			});
		}
		return { lookup, path: b.build(), svg };
	};
	return { arc, circle, curve, finish, line, move };
}

/** Where the tip is at `progress` (0–1) along the mark, at even speed (the block's `pointAt`). */
export function pointAt(lookup: Point[], progress: number): Point {
	"worklet";
	const p = Math.min(TABLE - 1, Math.max(0, progress * (TABLE - 1)));
	const low = Math.floor(p);
	const high = Math.min(TABLE - 1, low + 1);
	const u = p - low;
	return {
		x: lookup[low].x + (lookup[high].x - lookup[low].x) * u,
		y: lookup[low].y + (lookup[high].y - lookup[low].y) * u,
	};
}

const f = (n: number) => n.toFixed(2);

/**
 * One of production's arcs as a closed outline: quarter-ellipse corners (KAPPA) with its
 * per-corner radii, scaled down when a side overflows, as Skia's addRRect and the board's `rrect`
 * do. Returns its SVG for the resting mark.
 */
function arcOutline(
	m: ReturnType<typeof markBuilder>,
	b: Box,
	c: Corners,
	k: number,
	ox: number
): string {
	const x = ox + b.x * k;
	const y = b.y * k;
	const w = b.w * k;
	const h = b.h * k;
	const r = (v: readonly [number, number]) =>
		[b.r * v[0] * k, b.r * v[1] * k] as const;
	let tl = r(c.topLeft);
	let tr = r(c.topRight);
	let br = r(c.bottomRight);
	let bl = r(c.bottomLeft);
	const sc = Math.min(
		1,
		w / (tl[0] + tr[0]),
		w / (bl[0] + br[0]),
		h / (tl[1] + bl[1]),
		h / (tr[1] + br[1])
	);
	[tl, tr, br, bl] = [tl, tr, br, bl].map(
		(v) => [v[0] * sc, v[1] * sc] as const
	);
	const q = KAPPA;
	const segs: [number, number, number, number, number, number][] = [];
	m.move(x + tl[0], y);
	const go = (
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		ex: number,
		ey: number
	) => {
		m.curve(x1, y1, x2, y2, ex, ey);
		segs.push([x1, y1, x2, y2, ex, ey]);
	};
	const straight = (ex: number, ey: number, sx: number, sy: number) => {
		m.line(ex, ey);
		segs.push([
			sx + (ex - sx) / 3,
			sy + (ey - sy) / 3,
			sx + ((ex - sx) * 2) / 3,
			sy + ((ey - sy) * 2) / 3,
			ex,
			ey,
		]);
	};
	straight(x + w - tr[0], y, x + tl[0], y);
	go(
		x + w - tr[0] + q * tr[0],
		y,
		x + w,
		y + tr[1] - q * tr[1],
		x + w,
		y + tr[1]
	);
	straight(x + w, y + h - br[1], x + w, y + tr[1]);
	go(
		x + w,
		y + h - br[1] + q * br[1],
		x + w - br[0] + q * br[0],
		y + h,
		x + w - br[0],
		y + h
	);
	straight(x + bl[0], y + h, x + w - br[0], y + h);
	go(
		x + bl[0] - q * bl[0],
		y + h,
		x,
		y + h - bl[1] + q * bl[1],
		x,
		y + h - bl[1]
	);
	straight(x, y + tl[1], x, y + h - bl[1]);
	go(x, y + tl[1] - q * tl[1], x + tl[0] - q * tl[0], y, x + tl[0], y);
	return `M${f(x + tl[0])} ${f(y)}${segs.map((s) => `C${s.map(f).join(" ")}`).join("")}Z`;
}

/** Board spec card 01: `arcsAt(390, 480, .45, 0)`, scaled by 44/480 and centred in the 44 box. */
const MARK_BOX = 44;
const MARK_CANVAS = { H: 480, p: 0.45, W: 390 } as const;

function makeMarks(): Mark[] {
	// Sit with this: production's two arcs, facing each other across the gap.
	const sit = markBuilder();
	const a = arcsAt(MARK_CANVAS.W, MARK_CANVAS.H, MARK_CANVAS.p, 0);
	const k = MARK_BOX / MARK_CANVAS.H;
	const ox = (MARK_BOX - MARK_CANVAS.W * k) / 2;
	const sitSvg = `${arcOutline(sit, a.top, ARC.TOP_CORNERS, k, ox)} ${arcOutline(sit, a.bot, ARC.BOT_CORNERS, k, ox)}`;
	// You're not alone: three small circles.
	const peers = markBuilder();
	peers.circle(10, 20, 5);
	peers.circle(34, 20, 5);
	peers.circle(22, 36, 5);
	// I just needed to say it: the ensō's open circle (`M33 11a14 13 0 1 1-17-2`).
	const said = markBuilder();
	said.arc(23.108, 20.2, 14, 13, -45.05, 284.53);
	return [
		sit.finish(sitSvg),
		peers.finish(
			"M10 15a5 5 0 1 0 0.1 0 M34 15a5 5 0 1 0 0.1 0 M22 31a5 5 0 1 0 0.1 0"
		),
		said.finish("M33 11a14 13 0 1 1-17-2"),
	];
}

export const MARKS = makeMarks();
