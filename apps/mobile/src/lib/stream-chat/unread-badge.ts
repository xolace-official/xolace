import type { Event } from "stream-chat";

export type BadgeEvent = Pick<
	Event,
	"type" | "total_unread_count" | "unread_channels"
> & {
	me?: Pick<NonNullable<Event["me"]>, "total_unread_count">;
};

export function badgeFromEvents(current: number, event: BadgeEvent): number {
	if (event.me?.total_unread_count !== undefined) {
		return event.me.total_unread_count;
	}
	if (event.total_unread_count !== undefined) {
		return event.total_unread_count;
	}
	return current;
}
