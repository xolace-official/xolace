import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY, HOME } from "@/features/explore/copy";
import { minutesOf } from "@/features/explore/explore-model";
import type { DayPhase } from "@/lib/day-phase";

/** Pick up where you left off (`browse.explore.getContinue`). */
export type ContinueCard = FunctionReturnType<
	typeof api.browse.explore.getContinue
>[number];
/** Because you named … (`browse.explore.forYou`); null for a new member or with the setting off. */
export type ForYou = NonNullable<
	FunctionReturnType<typeof api.browse.explore.forYou>
>;
/** A personal shelf's track, with `plus`. */
export type HomeTrack = FunctionReturnType<
	typeof api.browse.explore.getForHour
>[number];
/** Five minutes or less (`browse.explore.getShort`). */
export type ShortItem = FunctionReturnType<
	typeof api.browse.explore.getShort
>[number];
/** A Lantern entry on a shelf. */
export type HomeEntry = Extract<ShortItem, { kind: "entry" }>["entry"];
/** Featured, and a New tile (`browse.hub`): no length, no `plus`. */
export type ShelfTrack = FunctionReturnType<
	typeof api.browse.hub.getNewShelf
>[number];

/** What a play needs from a track: any of the shelves' shapes. */
export type Playable = Pick<ShelfTrack, "_id" | "family" | "slug" | "title">;

/** A track as a row or a tile draws it, from any shelf. New and Featured carry no length. */
export type ItemTrack = Playable & {
	thumbUrl: string;
	thumbhash?: string;
	attribution?: string;
	durationSec?: number;
};

/** Anything the home draws as a row or a tile: a track (any shelf's shape) or an entry. */
export type HomeItem =
	| {
			kind: "track";
			key: string;
			plus: boolean;
			track: ItemTrack;
	  }
	| { kind: "entry"; key: string; plus: boolean; entry: HomeEntry };

/**
 * Every track is Xolace+ (production's gate; `exploreItems.ts`). New and Featured don't carry
 * `plus`, so they count as Xolace+ too.
 */
export const fromTrack = (track: ItemTrack & { plus?: boolean }): HomeItem => ({
	key: track._id,
	kind: "track",
	plus: track.plus ?? true,
	track,
});

export const fromShort = (s: ShortItem): HomeItem =>
	s.kind === "track"
		? fromTrack(s.track)
		: { entry: s.entry, key: s.entry._id, kind: "entry", plus: s.plus };

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Support audio · 8 min", "Music · 4 min", "Lantern · Advice · 3 min read". */
export function itemMeta(it: HomeItem): string {
	if (it.kind === "entry") {
		return [
			HOME.lantern,
			capitalise(it.entry.kind),
			HOME.readMin(it.entry.readMin),
		].join(" · ");
	}
	const family = COPY.family[it.track.family];
	const sec = it.track.durationSec;
	return sec === undefined
		? family
		: `${family} · ${COPY.minutes(minutesOf(sec))}`;
}

/** A 148 pt tile's meta: an entry drops "Lantern" ("Advice · 4 min read"). */
export function tileMeta(it: HomeItem): string {
	return it.kind === "entry"
		? `${capitalise(it.entry.kind)} · ${HOME.readMin(it.entry.readMin)}`
		: itemMeta(it);
}

/** A free listener meets the paywall on it. */
export const isLocked = (it: { plus: boolean }, locked: boolean) =>
	locked && it.plus;

export const hourTitle = (phase: DayPhase) => HOME.hour[phase];

export type CardMark = "playing" | "paused" | null;

/** "4 min left", with "Playing · " or "Paused · " while it's the one in the mini player; "40% read". */
export function continueMeta(c: ContinueCard, mark: CardMark): string {
	if (c.kind === "entry") {
		return HOME.readShare(c.percentRead);
	}
	const left = HOME.left(c.minutesLeft);
	if (mark === "playing") {
		return HOME.playing(left);
	}
	return mark === "paused" ? HOME.paused(left) : left;
}

/** How far through, 0–1: the ring's arc, the reading bar. */
export function continueShare(c: ContinueCard): number {
	if (c.kind === "entry") {
		return Math.min(1, Math.max(0, c.percentRead / 100));
	}
	const total = c.track.durationSec;
	return total > 0 ? Math.min(1, Math.max(0, c.positionSec / total)) : 0;
}

/** Choose for me's pool: the hour's tracks, then the short shelf, each once. */
export function pickPool(
	hour: readonly HomeTrack[],
	short: readonly ShortItem[]
): HomeItem[] {
	const seen = new Set<string>();
	const out: HomeItem[] = [];
	for (const it of [...hour.map(fromTrack), ...short.map(fromShort)]) {
		if (!seen.has(it.key)) {
			seen.add(it.key);
			out.push(it);
		}
	}
	return out;
}

/** The pick at `turn`: walks the pool, so the same one never shows twice in a row. */
export const pickAt = (pool: readonly HomeItem[], turn: number) =>
	pool.length === 0 ? null : pool[turn % pool.length];

const PAGE = 3;

/** Five minutes or less, in pages of three. */
export function pages<T>(items: readonly T[], size = PAGE): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size));
	}
	return out;
}

/** A row or tile's VoiceOver label: "title, meta", plus the lock for a free listener. */
export function itemLabel(it: HomeItem, meta: string, locked: boolean): string {
	const title = it.kind === "track" ? it.track.title : it.entry.title;
	return [title, meta, ...(isLocked(it, locked) ? [COPY.locked] : [])].join(
		", "
	);
}

/** Continue's card label: "title, 4 min left", plus the lock. */
export function continueLabel(
	c: ContinueCard,
	mark: CardMark,
	locked: boolean
): string {
	const title = c.kind === "track" ? c.track.title : c.entry.title;
	return [
		title,
		continueMeta(c, mark),
		...(isLocked(c, locked) ? [COPY.locked] : []),
	].join(", ");
}
