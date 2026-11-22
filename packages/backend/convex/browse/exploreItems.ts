import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { listItemValidator } from "../library/cards";
import { toListItem } from "../library/entries";
import { trackItems, trackItemValidator } from "./catalogue";

/**
 * What Explore home's personal shelves (B6, `explore.ts`) return per item: a
 * track as Browse's track item, a Lantern entry as Lantern's list item, each
 * with `plus`, whether a free listener meets the paywall on it.
 *
 * Every track is Xolace+ (production's gate: a free listener's tap on any
 * track opens the paywall, `features/explore/use-listen.ts`). Reading is
 * free. `plus` is per item so that can change without a client release.
 */

export const exploreTrackValidator = v.object({
	...trackItemValidator.fields,
	plus: v.boolean(),
});

export const exploreEntryValidator = v.object({
	...listItemValidator.fields,
	plus: v.boolean(),
});

const trackIsPlus = (_t: Doc<"audio_tracks">) => true;
const entryIsPlus = (_e: Doc<"library_entries">) => false;

/** `trackItems` plus `plus`. Make one per query call, like `trackItems`. */
export function exploreTracks(ctx: QueryCtx) {
	const toItem = trackItems(ctx);
	return async (t: Doc<"audio_tracks">) => ({
		...(await toItem(t)),
		plus: trackIsPlus(t),
	});
}

export const exploreEntry = async (e: Doc<"library_entries">) => ({
	...(await toListItem(e)),
	plus: entryIsPlus(e),
});

/** Day `day`'s turn of a list: the same `day % length` rotation as the New shelf. */
export function rotate<T>(items: T[], day: number | undefined): T[] {
	if (items.length === 0 || day === undefined || !Number.isFinite(day)) {
		return items;
	}
	const n = items.length;
	const offset = ((Math.floor(day) % n) + n) % n;
	return [...items.slice(offset), ...items.slice(0, offset)];
}
