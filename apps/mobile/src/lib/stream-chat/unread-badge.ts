import type { Event } from "stream-chat";

/** The slice of a Stream `Event` the fold reads; `me` narrowed to the total. */
export type BadgeEvent = Pick<
	Event,
	"type" | "total_unread_count" | "unread_channels"
> & {
	me?: Pick<NonNullable<Event["me"]>, "total_unread_count">;
};

/** Folds one Stream event into the unread total. Events carry the absolute `total_unread_count`
 * (on `me` for the handshake), so a retry is idempotent and a non-member channel's event
 * changes nothing. */
export function badgeFromEvents(current: number, event: BadgeEvent): number {
	if (event.me?.total_unread_count !== undefined) {
		return event.me.total_unread_count;
	}
	if (event.total_unread_count !== undefined) {
		return event.total_unread_count;
	}
	return current;
}
