import type { Event } from 'stream-chat';

/** The slice of a Stream `Event` the fold reads; `me` narrowed to the total. */
export type BadgeEvent = Pick<Event, 'type' | 'total_unread_count' | 'unread_channels'> & {
  me?: Pick<NonNullable<Event['me']>, 'total_unread_count'>;
};

/**
 * Folds one Stream event into the unread total. Stream owns the number: the
 * handshake `health.check` carries it on `me`, and every event that changes it
 * (`notification.message_new`, `notification.mark_read`, `message.read`,
 * `message.new` for a member) carries the new absolute `total_unread_count`.
 * Absolute, not a delta — so a retried event is idempotent, and an event for a
 * channel this user is not a member of carries no total and changes nothing.
 */
export function badgeFromEvents(current: number, event: BadgeEvent): number {
  if (event.me?.total_unread_count !== undefined) return event.me.total_unread_count;
  if (event.total_unread_count !== undefined) return event.total_unread_count;
  return current;
}
