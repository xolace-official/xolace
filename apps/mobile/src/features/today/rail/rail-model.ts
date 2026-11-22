import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

type ShelfItem = FunctionReturnType<typeof api.browse.hub.getNewShelf>[number];

export type RailTile = {
	id: string;
	slug: string;
	family: ShelfItem["family"];
	title: string;
	sub: string;
	cover: string;
	thumbhash?: string;
};

const RAIL_MAX = 4;

export function railTiles(shelf: readonly ShelfItem[]): RailTile[] {
	return shelf.slice(0, RAIL_MAX).map((item) => ({
		cover: item.thumbUrl,
		family: item.family,
		id: item._id,
		slug: item.slug,
		sub: COPY.listen.family[item.family],
		thumbhash: item.thumbhash,
		title: item.title,
	}));
}

export const quietTile = (tiles: readonly RailTile[]): RailTile | null =>
	tiles.find((t) => t.family === "music") ?? tiles[0] ?? null;

export const TILE = {
	gap: 14,
	hang: 16,
	pressDelayMs: 90,
	previewMs: 350,
	r: 22,
	stringInset: 26,
	turn: 0.35,
	w: 132,
} as const;

export const BARS: readonly (readonly [number, number])[] = [
	[0.4, -0.1],
	[0.7, -0.5],
	[0.55, -0.3],
	[0.9, -0.7],
	[0.6, -0.2],
	[1, -0.6],
	[0.75, -0.4],
	[0.45, -0.8],
	[0.85, -0.15],
	[0.65, -0.55],
	[0.95, -0.35],
	[0.5, -0.75],
	[0.7, -0.25],
	[0.4, -0.65],
];
export const EQ = [0, -0.25, -0.45] as const;
