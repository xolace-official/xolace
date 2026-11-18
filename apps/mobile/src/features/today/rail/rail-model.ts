import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

type ShelfItem = FunctionReturnType<typeof api.browse.hub.getNewShelf>[number];

/** A tile on the rail. */
export type RailTile = {
	id: string;
	slug: string;
	family: ShelfItem["family"];
	title: string;
	/** "Support audio" or "Music". */
	sub: string;
	cover: string;
	thumbhash?: string;
};

/** The rail holds at most this many tiles (the New shelf's own size; one pendulum each). */
const RAIL_MAX = 4;

/** The hub's New shelf as the rail draws it: never padded, hidden with none. */
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

/**
 * Something for the quiet, late: the rail's first piece of music, else its first track (the
 * row is always there at night while the shelf has anything), else none.
 */
export const quietTile = (tiles: readonly RailTile[]): RailTile | null =>
	tiles.find((t) => t.family === "music") ?? tiles[0] ?? null;

/** The rail, from the board's `.rail*`, `.chime*`, `.str`, `.art`, `.wave`, `.eq`. */
export const TILE = {
	gap: 14,
	/** Tiles hang 16 pt below the hairline on strings 26 pt in from each side. */
	hang: 16,
	/** A touch rests this long before the preview, so a scroll wins. */
	pressDelayMs: 90,
	/** A press longer than this is a preview, not a tap to play. */
	previewMs: 350,
	r: 22,
	stringInset: 26,
	/** A tile turns by this share of its pendulum's angle. */
	turn: 0.35,
	w: 132,
} as const;

/** The preview waveform: [height share, delay s] for 14 bars. */
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
/** The playing meter: three bars, 0.6 s, offset. */
export const EQ = [0, -0.25, -0.45] as const;
