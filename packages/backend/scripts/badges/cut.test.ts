/**
 * #690: the local cut-out. What can go wrong: a stray saturated speck in the
 * backdrop throws off the crop, the corners keep the grey backdrop (a fringe
 * on the app's dark surface), or a rung's pips touch anything but the bottom
 * of the rim, so the rim stops being pixel-identical across a stage.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { type Cut, cutBadge, type Marker, markerFor } from "./cut";

const WIDTH = 400;
const HEIGHT = 300;
const RADIUS = 100;
const RIM = 20;
const GREY = [200, 200, 200];
const EMBER = [230, 140, 20];
const SKY = [40, 40, 120];

/** A grey backdrop, a round badge (ember rim, indigo sky), and a 3px ember speck far from it. */
function syntheticBadge(): Promise<Buffer> {
	const data = Buffer.alloc(WIDTH * HEIGHT * 3);
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < WIDTH; x++) {
			const dist = Math.hypot(x + 0.5 - WIDTH / 2, y + 0.5 - HEIGHT / 2);
			const speck = x >= 20 && x < 23 && y >= 20 && y < 23;
			let color = GREY;
			if (dist <= RADIUS - RIM) {
				color = SKY;
			} else if (dist <= RADIUS || speck) {
				color = EMBER;
			}
			data.set(color, (y * WIDTH + x) * 3);
		}
	}
	return sharp(data, { raw: { channels: 3, height: HEIGHT, width: WIDTH } })
		.png()
		.toBuffer();
}

const alphaAt = (cut: Cut, x: number, y: number) =>
	cut.data[(y * cut.size + x) * 4 + 3];

/** Pixels that differ between two cuts of the same source. */
function differing(a: Cut, b: Cut): { x: number; y: number }[] {
	const out: { x: number; y: number }[] = [];
	for (let i = 0; i < a.data.length; i += 4) {
		if (a.data.compare(b.data, i, i + 4, i, i + 4) !== 0) {
			out.push({ x: (i / 4) % a.size, y: Math.floor(i / 4 / a.size) });
		}
	}
	return out;
}

/** Separate marks along the rim: runs of columns with a gap between them. */
function clusters(points: { x: number }[]): number {
	const columns = [...new Set(points.map((p) => p.x))].sort((a, b) => a - b);
	return columns.filter((x, i) => i === 0 || x - (columns[i - 1] ?? 0) > 1)
		.length;
}

describe("cutBadge", () => {
	it("crops square and tight to the rim, ignoring a stray speck", async () => {
		const cut = await cutBadge(await syntheticBadge());
		expect(cut.size).toBeGreaterThan(2 * RADIUS * 0.96);
		expect(cut.size).toBeLessThanOrEqual(2 * RADIUS);
		expect(cut.data).toHaveLength(cut.size * cut.size * 4);
	});

	it("cuts just inside the rim: transparent corners, opaque face", async () => {
		const cut = await cutBadge(await syntheticBadge());
		const last = cut.size - 1;
		for (const [x, y] of [
			[0, 0],
			[last, 0],
			[0, last],
			[last, last],
		] as const) {
			expect(alphaAt(cut, x, y)).toBe(0);
		}
		const mid = Math.floor(cut.size / 2);
		expect(alphaAt(cut, mid, mid)).toBe(255);
		// The rim's outermost pixel still shows the rim, never the grey backdrop.
		const edge = (mid * cut.size + 1) * 4;
		const [r, g, b] = cut.data.subarray(edge, edge + 3);
		expect(
			Math.max(r ?? 0, g ?? 0, b ?? 0) - Math.min(r ?? 0, g ?? 0, b ?? 0)
		).toBeGreaterThan(100);
	});

	it.each([1, 2, 3])(
		"lays %i ember-gem pips on the bottom of an otherwise identical rim",
		async (count) => {
			const png = await syntheticBadge();
			const base = await cutBadge(png);
			const marked = await cutBadge(png, { count, kind: "gem" });

			const changed = differing(base, marked);
			expect(changed.length).toBeGreaterThan(0);
			expect(clusters(changed)).toBe(count);
			const centre = base.size / 2;
			for (const { x, y } of changed) {
				expect(y).toBeGreaterThan(centre);
				// On the rim band, never the sky inside it.
				expect(Math.hypot(x + 0.5 - centre, y + 0.5 - centre)).toBeGreaterThan(
					centre * 0.8
				);
			}
		}
	);

	it("lays one star per year", async () => {
		const png = await syntheticBadge();
		const changed = differing(
			await cutBadge(png),
			await cutBadge(png, { count: 4, kind: "star" })
		);
		expect(clusters(changed)).toBe(4);
	});
});

describe("markerFor", () => {
	it.each<[string, Marker | undefined]>([
		["streak-spark-1", { count: 1, kind: "gem" }],
		["streak-spark-3", { count: 3, kind: "gem" }],
		["streak-hearth-5", { count: 5, kind: "gem" }],
		["streak-year-1", { count: 1, kind: "star" }],
		["streak-year-5", { count: 5, kind: "star" }],
		["streak-bonfire", undefined],
		["joined", undefined],
		["showing-up-5", undefined],
		["read-10", undefined],
	])("%s → %o", (artKey, marker) => {
		expect(markerFor(artKey)).toEqual(marker);
	});
});
