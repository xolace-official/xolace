import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY, HOME } from "@/features/explore/copy";
import { minutesOf } from "@/features/explore/explore-model";
import type { DayPhase } from "@/lib/day-phase";

export type ContinueCard = FunctionReturnType<
	typeof api.browse.explore.getContinue
>[number];
export type ForYou = NonNullable<
	FunctionReturnType<typeof api.browse.explore.forYou>
>;
export type HomeTrack = FunctionReturnType<
	typeof api.browse.explore.getForHour
>[number];
export type ShortItem = FunctionReturnType<
	typeof api.browse.explore.getShort
>[number];
export type HomeEntry = Extract<ShortItem, { kind: "entry" }>["entry"];
export type ShelfTrack = FunctionReturnType<
	typeof api.browse.hub.getNewShelf
>[number];

export type Playable = Pick<ShelfTrack, "_id" | "family" | "slug" | "title">;

export type ItemTrack = Playable & {
	thumbUrl: string;
	thumbhash?: string;
	attribution?: string;
	durationSec?: number;
};

export type HomeItem =
	| {
			kind: "track";
			key: string;
			plus: boolean;
			track: ItemTrack;
	  }
	| { kind: "entry"; key: string; plus: boolean; entry: HomeEntry };

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

export function tileMeta(it: HomeItem): string {
	return it.kind === "entry"
		? `${capitalise(it.entry.kind)} · ${HOME.readMin(it.entry.readMin)}`
		: itemMeta(it);
}

export const isLocked = (it: { plus: boolean }, locked: boolean) =>
	locked && it.plus;

export const hourTitle = (phase: DayPhase) => HOME.hour[phase];

export type CardMark = "playing" | "paused" | null;

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

export function continueShare(c: ContinueCard): number {
	if (c.kind === "entry") {
		return Math.min(1, Math.max(0, c.percentRead / 100));
	}
	const total = c.track.durationSec;
	return total > 0 ? Math.min(1, Math.max(0, c.positionSec / total)) : 0;
}

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

export const pickAt = (pool: readonly HomeItem[], turn: number) =>
	pool.length === 0 ? null : pool[turn % pool.length];

const PAGE = 3;

export function pages<T>(items: readonly T[], size = PAGE): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size));
	}
	return out;
}

export function itemLabel(it: HomeItem, meta: string, locked: boolean): string {
	const title = it.kind === "track" ? it.track.title : it.entry.title;
	return [title, meta, ...(isLocked(it, locked) ? [COPY.locked] : [])].join(
		", "
	);
}

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

/** Shelves that draw a skeleton until their query answers; continue and for-you just appear. */
type LoadingShelves = {
	featured: ShelfTrack | null | undefined;
	hour: HomeTrack[] | undefined;
	fresh: ShelfTrack[] | undefined;
	short: ShortItem[] | undefined;
};

/** True while any skeleton shelf is still waiting on its first answer. */
export const shelvesLoading = (home: LoadingShelves): boolean =>
	[home.featured, home.hour, home.fresh, home.short].includes(undefined);
