// Body outlines in a 100×100 box, plus where the face sits on each.

import { Skia } from "@shopify/react-native-skia";

export type BodyName = "cloud" | "drop" | "flame" | "orb" | "square";

// The logo's flame: rounded base, tall tip near the top middle, a smaller tip to its right.
const FLAME = [
	"M50 97",
	"C25 97 9 82 9 61",
	"C9 43 19 31 31 22",
	"C39 16 47 10 51 2",
	"C55 10 55 18 60 23",
	"C64 20 70 16 77 12",
	"C78 19 79 25 82 31",
	"C88 40 91 50 91 61",
	"C91 82 75 97 50 97 Z",
].join(" ");

const DROP =
	"M50 6 C58 22 86 42 86 63 C86 84 70 97 50 97 C30 97 14 84 14 63 C14 42 42 22 50 6 Z";

const CLOUD = [
	"M24 88",
	"C10 88 5 74 12 66",
	"C5 55 14 42 27 45",
	"C29 31 45 25 55 34",
	"C63 23 82 28 81 43",
	"C94 45 97 60 88 67",
	"C95 78 87 90 75 88 Z",
].join(" ");

const ORB = "M50 15 A41 41 0 1 1 49.99 15 Z";

const SQUARE_INSET = 10;
const SQUARE_SIDE = 80;
const SQUARE_RADIUS = 24;
const SQUARE = Skia.PathBuilder.Make()
	.addRRect(
		Skia.RRectXY(
			Skia.XYWHRect(SQUARE_INSET, SQUARE_INSET + 2, SQUARE_SIDE, SQUARE_SIDE),
			SQUARE_RADIUS,
			SQUARE_RADIUS
		)
	)
	.detach();

const fromSvg = (d: string) =>
	Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();

export const BODY_PATHS = {
	cloud: fromSvg(CLOUD),
	drop: fromSvg(DROP),
	flame: fromSvg(FLAME),
	orb: fromSvg(ORB),
	square: SQUARE,
};

/** Eye line (y) and eye spacing for each body. */
export const FACE_ANCHOR: Record<BodyName, { y: number; spread: number }> = {
	cloud: { spread: 14, y: 61 },
	drop: { spread: 13, y: 64 },
	flame: { spread: 14, y: 62 },
	orb: { spread: 14, y: 54 },
	square: { spread: 15, y: 50 },
};
