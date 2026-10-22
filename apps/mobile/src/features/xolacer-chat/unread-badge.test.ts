import { describe, expect, it } from 'vitest';
import { badgeFromEvents, type BadgeEvent } from '@/src/features/xolacer-chat/unread-badge';

const fold = (events: BadgeEvent[], start = 0) => events.reduce(badgeFromEvents, start);

describe('badgeFromEvents', () => {
  it('takes the handshake total from the first health.check', () => {
    expect(fold([{ type: 'health.check', me: { total_unread_count: 4 } }])).toBe(4);
  });

  it('a new message in a channel this client is not watching moves the total', () => {
    expect(
      fold([
        { type: 'health.check', me: { total_unread_count: 1 } },
        { type: 'notification.message_new', total_unread_count: 2 },
      ]),
    ).toBe(2);
  });

  it('reading the last unread conversation lands on zero', () => {
    expect(
      fold([
        { type: 'health.check', me: { total_unread_count: 1 } },
        { type: 'notification.mark_read', total_unread_count: 0, unread_channels: 0 },
      ]),
    ).toBe(0);
  });

  it('a read on another device clears through message.read', () => {
    expect(fold([{ type: 'message.read', total_unread_count: 0 }], 3)).toBe(0);
  });

  it('an event for a channel the user is not a member of carries no total and is ignored', () => {
    expect(fold([{ type: 'message.new' }, { type: 'typing.start' }], 2)).toBe(2);
  });

  it('a redelivered event is idempotent — totals are absolute, not deltas', () => {
    const event: BadgeEvent = { type: 'notification.message_new', total_unread_count: 3 };
    expect(fold([event, event], 2)).toBe(3);
  });

  it('a periodic health.check without me leaves the total alone', () => {
    expect(fold([{ type: 'health.check' }], 5)).toBe(5);
  });
});
