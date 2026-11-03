// Badge cut-out (#682, #687, #690), ported from the prototype's
// cut-badge.prototype.sh so the approved cuts come out the same.
//
// Finds the rim by saturation: the generator's grey backdrop and its soft
// shadow have none, so every saturated pixel is badge. An opening drops
// saturated specks too small to be the badge before the bounding box is taken.
// The crop is a square a hair (~0.7%) inside the rim's outer edge, which drops
// the anti-aliased fringe blended with grey; a circular alpha mask with a
// ~1px feather cuts it out. Streak rungs get their marker (ember-gem pips, or
// stars on yearly rungs) on the bottom of the rim before the mask, so every
// rung of a stage shares a pixel-identical rim. Native resolution, near-lossless
// WebP (q95, alpha 100).

import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

/** Pips (`gem`) for a stage rung's place in its stage, stars for year k. */
export type Marker = { count: number; kind: "gem" | "star" };

/** A cut-out badge: `size`² RGBA pixels. */
export type Cut = { data: Buffer; size: number };

/** HSL saturation above which a pixel is badge, not backdrop (the prototype's `-threshold 30%`). */
const SATURATED = 0.3;
/** Saturated blobs narrower than 2·this+1 px are noise (`-morphology Open Disk:4`). */
const OPEN_RADIUS = 4;
/** The crop sits d / this inside the rim's outer edge, +1px. */
const INSET_DIVISOR = 150;
/** Width of the mask's soft edge (the prototype's 0.7px blur). */
const FEATHER_PX = 1.5;

/** ThumbHash encodes at most 100×100 RGBA. */
const THUMBHASH_MAX_PX = 100;

/** Marks sit on the middle of the rim band, as fractions of the cut's radius. */
const RIM_MIDDLE = 0.9;
const GEM_RADIUS = 0.05;
const STAR_RADIUS = 0.06;
/** Angle between neighbouring marks, centred on the bottom of the rim. */
const MARK_STEP_RADIANS = 0.16;

const STAGE_RUNG = /^streak-(?!year-)[a-z]+-([1-9]\d*)$/;
const YEAR_RUNG = /^streak-year-([1-9]\d*)$/;

/** The marker an artKey's image carries (#687): only streak rungs have one. */
export function markerFor(artKey: string): Marker | undefined {
	const stage = STAGE_RUNG.exec(artKey)?.[1];
	if (stage) {
		return { count: Number(stage), kind: "gem" };
	}
	const year = YEAR_RUNG.exec(artKey)?.[1];
	if (year) {
		return { count: Number(year), kind: "star" };
	}
}

export async function cutBadge(png: Buffer, marker?: Marker): Promise<Cut> {
	const { data, info } = await sharp(png)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const rim = findRim(data, info.width, info.height);
	const diameter = Math.min(rim.width, rim.height);
	// Centred off the width, both ways, as the approved prototype cuts were.
	const half = Math.floor(rim.width / 2);
	const cx = rim.left + half;
	const cy = rim.top + half;
	const radius =
		Math.floor(diameter / 2) - (Math.floor(diameter / INSET_DIVISOR) + 1);
	const size = 2 * radius;
	if (
		cx - radius < 0 ||
		cy - radius < 0 ||
		cx + radius > info.width ||
		cy + radius > info.height
	) {
		throw new Error("the badge runs off the edge of the image");
	}

	let face = sharp(data, { raw: info }).extract({
		height: size,
		left: cx - radius,
		top: cy - radius,
		width: size,
	});
	if (marker) {
		// Materialise the crop first: sharp runs composite before extract.
		const cropped = await face.png().toBuffer();
		face = sharp(cropped).composite([
			{ input: Buffer.from(markerSvg(size, marker)) },
		]);
	}
	const rgba = await face.removeAlpha().ensureAlpha().raw().toBuffer();
	applyCircleMask(rgba, size);
	return { data: rgba, size };
}

/** Near-lossless WebP of a cut, as the prototype wrote it. */
export function encodeBadge({ data, size }: Cut): Promise<Buffer> {
	return sharp(data, { raw: { channels: 4, height: size, width: size } })
		.webp({ alphaQuality: 100, effort: 6, quality: 95 })
		.toBuffer();
}

/** Base64 ThumbHash of an image; it keeps the badge's transparent corners. */
export async function thumbhashOf(image: Buffer): Promise<string> {
	const { data, info } = await sharp(image)
		.resize(THUMBHASH_MAX_PX, THUMBHASH_MAX_PX, { fit: "inside" })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString(
		"base64"
	);
}

type Box = { height: number; left: number; top: number; width: number };

function findRim(rgb: Buffer, width: number, height: number): Box {
	const mask = new Uint8Array(width * height);
	for (let i = 0; i < mask.length; i++) {
		mask[i] =
			hslSaturation(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]) > SATURATED
				? 1
				: 0;
	}
	// Opening: erode then dilate, each as a row pass and a column pass.
	const eroded = slide(
		slide(mask, width, height, "row", true),
		width,
		height,
		"column",
		true
	);
	const opened = slide(
		slide(eroded, width, height, "row", false),
		width,
		height,
		"column",
		false
	);
	let left = width;
	let top = height;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (opened[y * width + x]) {
				left = Math.min(left, x);
				right = Math.max(right, x);
				top = Math.min(top, y);
				bottom = Math.max(bottom, y);
			}
		}
	}
	if (right < 0) {
		throw new Error("no saturated rim found");
	}
	return { height: bottom - top + 1, left, top, width: right - left + 1 };
}

function hslSaturation(r = 0, g = 0, b = 0): number {
	const max = Math.max(r, g, b) / 255;
	const min = Math.min(r, g, b) / 255;
	const lightness = (max + min) / 2;
	if (max === min) {
		return 0;
	}
	return lightness <= 0.5
		? (max - min) / (max + min)
		: (max - min) / (2 - max - min);
}

/**
 * One pass of a (2·OPEN_RADIUS+1)-wide window along rows or columns: erode
 * keeps a pixel only if its whole window is set, dilate if any of it is.
 */
function slide(
	mask: Uint8Array,
	width: number,
	height: number,
	axis: "row" | "column",
	erode: boolean
): Uint8Array {
	const out = new Uint8Array(mask.length);
	const lines = axis === "row" ? height : width;
	const length = axis === "row" ? width : height;
	const at = (line: number, i: number) =>
		axis === "row" ? line * width + i : i * width + line;
	const window = 2 * OPEN_RADIUS + 1;
	const prefix = new Int32Array(length + 1);
	for (let line = 0; line < lines; line++) {
		for (let i = 0; i < length; i++) {
			prefix[i + 1] = (prefix[i] ?? 0) + (mask[at(line, i)] ?? 0);
		}
		for (let i = 0; i < length; i++) {
			const from = Math.max(0, i - OPEN_RADIUS);
			const to = Math.min(length, i + OPEN_RADIUS + 1);
			const set = (prefix[to] ?? 0) - (prefix[from] ?? 0);
			out[at(line, i)] = (erode ? set === window : set > 0) ? 1 : 0;
		}
	}
	return out;
}

function applyCircleMask(rgba: Buffer, size: number) {
	const centre = size / 2;
	// The prototype's circle stops 1px short of the crop.
	const radius = centre - 1;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const dist = Math.hypot(x + 0.5 - centre, y + 0.5 - centre);
			const coverage = Math.min(
				1,
				Math.max(0, (radius - dist) / FEATHER_PX + 0.5)
			);
			const i = (y * size + x) * 4 + 3;
			rgba[i] = Math.round((rgba[i] ?? 0) * coverage);
		}
	}
}

/** A `size`² transparent overlay with `count` marks along the bottom of the rim. */
function markerSvg(size: number, { count, kind }: Marker): string {
	const centre = size / 2;
	const orbit = centre * RIM_MIDDLE;
	const marks = Array.from({ length: count }, (_, i) => {
		const angle = (i - (count - 1) / 2) * MARK_STEP_RADIANS;
		const x = centre + orbit * Math.sin(angle);
		const y = centre + orbit * Math.cos(angle);
		return kind === "gem"
			? gem(x, y, centre * GEM_RADIUS)
			: star(x, y, centre * STAR_RADIUS);
	});
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
<defs>
<radialGradient id="ember" cx="38%" cy="32%" r="72%">
<stop offset="0" stop-color="#fff1c2"/><stop offset="0.22" stop-color="#ffb347"/>
<stop offset="0.6" stop-color="#e2440f"/><stop offset="1" stop-color="#861a05"/>
</radialGradient>
<radialGradient id="starlight" cx="50%" cy="40%" r="65%">
<stop offset="0" stop-color="#fffdf0"/><stop offset="0.5" stop-color="#ffe08a"/>
<stop offset="1" stop-color="#e0a020"/>
</radialGradient>
</defs>
${marks.join("\n")}
</svg>`;
}

// Mark shading, as fractions of the mark's radius: a dark outline so it reads
// against the gold rim, and on a gem a specular highlight up and to the left.
const GEM_OUTLINE = 0.16;
const STAR_OUTLINE = 0.12;
const HIGHLIGHT = { opacity: 0.75, rx: 0.32, ry: 0.2, x: -0.3, y: -0.35 };

function gem(x: number, y: number, r: number): string {
	return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ember)" stroke="#4a0e02" stroke-width="${r * GEM_OUTLINE}"/>
<ellipse cx="${x + r * HIGHLIGHT.x}" cy="${y + r * HIGHLIGHT.y}" rx="${r * HIGHLIGHT.rx}" ry="${r * HIGHLIGHT.ry}" fill="#ffffff" fill-opacity="${HIGHLIGHT.opacity}"/>`;
}

const STAR_POINTS = 5;
const STAR_INNER = 0.45;

function star(x: number, y: number, r: number): string {
	const points = Array.from({ length: STAR_POINTS * 2 }, (_, i) => {
		const reach = i % 2 === 0 ? r : r * STAR_INNER;
		const angle = (i * Math.PI) / STAR_POINTS - Math.PI / 2;
		return `${x + reach * Math.cos(angle)},${y + reach * Math.sin(angle)}`;
	});
	return `<polygon points="${points.join(" ")}" fill="url(#starlight)" stroke="#5a3000" stroke-width="${r * STAR_OUTLINE}" stroke-linejoin="round"/>`;
}
