import { Platform } from "react-native";

type Row = { inset: number; tile: number; gap: number; viewport: number };

/**
 * The tiles a horizontal row shows at `scrollX`, as "first-last" (or "" for none). A string so a
 * scroll handler can compare windows and skip the state update while the same tiles stay in view.
 */
export function tileWindow(scrollX: number, count: number, row: Row): string {
	let first = -1;
	let last = -1;
	for (let i = 0; i < count; i++) {
		const left = row.inset + i * (row.tile + row.gap) - scrollX;
		if (left + row.tile > 0 && left < row.viewport) {
			if (first < 0) {
				first = i;
			}
			last = i;
		}
	}
	return first < 0 ? "" : `${first}-${last}`;
}

export function inWindow(window: string, i: number): boolean {
	if (!window) {
		return false;
	}
	const [first, last] = window.split("-").map(Number);
	return i >= first && i <= last;
}

/**
 * Which loop tiles play. iOS plays every tile in view. Android plays only the chosen one: each
 * playing tile is its own decoder on top of the full-screen loop, phones cap how many run at once,
 * and the rest show their first-frame poster, which is the same picture standing still.
 */
const TILES_PLAY: "in-view" | "chosen" =
	Platform.OS === "android" ? "chosen" : "in-view";

export const tilePlays = (o: {
	moving: boolean;
	inView: boolean;
	chosen: boolean;
	rule?: "in-view" | "chosen";
}) =>
	o.moving && o.inView && ((o.rule ?? TILES_PLAY) === "in-view" || o.chosen);
