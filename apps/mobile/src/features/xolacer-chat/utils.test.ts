import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  declineCooldownActive,
  hasSpoken,
  resolveMessageIdentity,
  unreadBadge,
  type ConversationStatus,
} from '@/src/features/xolacer-chat/utils';
import { sortByPresence } from '@/src/features/xolacer-chat/presence-ordering';

describe('declineCooldownActive', () => {
  const DAY = 86400000;

  // server-computed retryAvailableAt → is the door still shut?
  const cases: { inMs?: number; expected: boolean; label: string }[] = [
    { expected: false, label: 'no cooldown on the row' },
    { inMs: 1000, expected: true, label: 'a second left' },
    // The dead-end this guard exists for: the server stamps this timestamp
    // inside a reactive query, and nothing writes when the window elapses — so
    // a stale, already-past value arrives from cache. Reading it as "a cooldown
    // exists" would disable the CTA forever, since a disabled button never
    // writes anything that could refresh the cache.
    { inMs: 0, expected: false, label: 'exactly now' },
    { inMs: -30 * DAY, expected: false, label: 'long expired, still cached' },
  ];

  for (const c of cases) {
    it(`${c.label} → ${c.expected}`, () => {
      expect(
        declineCooldownActive(c.inMs === undefined ? undefined : Date.now() + c.inMs),
      ).toBe(c.expected);
    });
  }
});

describe('daysUntil', () => {
  const DAY = 86400000;

  // ms from now → whole days the sentence says to wait
  const cases: { inMs: number; expected: number; label: string }[] = [
    { inMs: 7 * DAY, expected: 7, label: 'a full week out' },
    { inMs: 6.5 * DAY, expected: 7, label: 'part-days round up, never down' },
    // The floor: hours left must never read as "ask again in 0 days", which
    // describes a wait that is already over.
    { inMs: 3600_000, expected: 1, label: 'an hour left' },
    { inMs: 0, expected: 1, label: 'already elapsed' },
  ];

  for (const c of cases) {
    it(`${c.label} → ${c.expected}`, () => {
      expect(daysUntil(Date.now() + c.inMs)).toBe(c.expected);
    });
  }
});

describe('hasSpoken', () => {
  // status | closedReason → did these two ever exchange a message?
  const cases: {
    status: ConversationStatus;
    reason?: 'declined' | 'expired' | 'blocked' | 'xolacer_left';
    expected: boolean;
    label?: string;
  }[] = [
    // Never accepted — no channel was ever created, so nothing was written.
    { status: 'requested', expected: false },
    {
      status: 'closed',
      reason: 'declined',
      expected: false,
      label: 'declined before accept',
    },
    {
      status: 'closed',
      reason: 'expired',
      expected: false,
      label: 'expired before accept',
    },
    // Accepted at some point, so there is history worth promising to keep.
    { status: 'open', expected: true },
    {
      status: 'closed',
      reason: 'xolacer_left',
      expected: true,
      label: 'left after accepting',
    },
    { status: 'closed', expected: true, label: 'closed with no reason' },
  ];

  for (const c of cases) {
    const name = `${c.label ? `${c.label}: ` : ''}status=${c.status} reason=${c.reason} → ${c.expected}`;
    it(name, () => {
      expect(hasSpoken({ status: c.status, closedReason: c.reason })).toBe(
        c.expected,
      );
    });
  }
});

describe('unreadBadge', () => {
  // status | count → what the row's pill shows (null = no pill)
  const cases: {
    status: ConversationStatus;
    count: number;
    expected: { label: string; a11y: string } | null;
    label: string;
  }[] = [
    {
      status: 'open',
      count: 0,
      expected: null,
      label: 'nothing unread, nothing shown',
    },
    {
      status: 'open',
      count: 1,
      expected: { label: '1', a11y: '1 unread message' },
      label: 'one unread reads singular',
    },
    {
      status: 'open',
      count: 3,
      expected: { label: '3', a11y: '3 unread messages' },
      label: 'a live conversation shows its count',
    },
    // A resting thread is still one the user can pick back up, and the row says
    // so — suppressing the badge would mute the one signal that brings them back.
    {
      status: 'resting',
      count: 3,
      expected: { label: '3', a11y: '3 unread messages' },
      label: 'a quiet conversation still counts',
    },
    // "There is something to decide", not "there is something to read".
    {
      status: 'requested',
      count: 3,
      expected: null,
      label: 'an unaccepted request never badges',
    },
    {
      status: 'closed',
      count: 3,
      expected: null,
      label: 'a finished conversation stops asking',
    },
    // The pill has a fixed width; a screen reader does not.
    {
      status: 'open',
      count: 150,
      expected: { label: '99+', a11y: '150 unread messages' },
      label: 'past the cap the label caps and the announcement does not',
    },
  ];

  for (const c of cases) {
    it(`${c.label}: status=${c.status} count=${c.count}`, () => {
      expect(unreadBadge(c.status, c.count)).toEqual(c.expected);
    });
  }
});

describe('resolveMessageIdentity', () => {
  const THEM = 'profile_them';

  const SOMEONE_ELSE = 'profile_system';

  type Conversation = {
    counterpartProfileId: string;
    counterpartName: string;
    counterpartPhotoUrl?: string;
  };

  // A conversation where I'm the seeker: the counterpart is a real xolacer,
  // so their real name and photo are the correct thing to show.
  const asSeeker: Conversation = {
    counterpartProfileId: THEM,
    counterpartName: 'Maya',
    counterpartPhotoUrl: 'https://cdn/maya.jpg',
  };
  // A conversation where I'm the xolacer: the counterpart is anonymous, so
  // the server already resolved them to a pseudonym + catalog avatar.
  const asXolacer: Conversation = {
    counterpartProfileId: THEM,
    counterpartName: 'Camper 4F2A',
    counterpartPhotoUrl: 'https://cdn/avatar-fox.png',
  };

  // sender | conversation → identity to render (null = leave the SDK's)
  const cases: {
    sender?: string;
    conversation: Conversation;
    expected: { name: string; image?: string } | null;
    label: string;
  }[] = [
    // Also the reconnect/relogin case, where the client's own user id is
    // momentarily unset: the resolver has no knowledge of who "I" am, only of
    // who the counterpart is, so an unset client id cannot reach it and my
    // bubbles stay mine on the same single assertion.
    {
      sender: undefined,
      conversation: asSeeker,
      expected: null,
      label: 'no sender id, nothing to override',
    },
    // A sender who is neither member — a system notice, a safety intervention.
    // Falls back to the SDK rather than wearing the counterpart's face.
    {
      sender: SOMEONE_ELSE,
      conversation: asSeeker,
      expected: null,
      label: 'a sender who is neither party keeps the SDK identity',
    },
    {
      sender: THEM,
      conversation: asSeeker,
      expected: { name: 'Maya', image: 'https://cdn/maya.jpg' },
      label: 'counterpart in a seeker-role conversation is the real xolacer',
    },
    // The regression this exists for. The counterpart is a complete, active
    // xolacer somewhere else in the app — their real identity is right there
    // on the object, next to the anonymous one — and their role in *this*
    // conversation is seeker. The resolver reads only the counterpart fields,
    // so the real name and photo can't reach the bubble however they arrive.
    {
      sender: THEM,
      conversation: {
        ...asXolacer,
        xolacerComplete: true,
        xolacerActive: true,
        displayName: 'Maya',
        photoUrl: 'https://cdn/maya.jpg',
      } as Conversation,
      expected: { name: 'Camper 4F2A', image: 'https://cdn/avatar-fox.png' },
      label: 'counterpart is also an active xolacer elsewhere: still anonymous',
    },
  ];

  for (const c of cases) {
    it(`${c.label}: sender=${c.sender}`, () => {
      expect(resolveMessageIdentity(c.sender, c.conversation)).toEqual(
        c.expected,
      );
    });
  }
});

describe('sortByPresence', () => {
  const row = (name: string, present: boolean, atCapacity = false) => ({
    displayName: name,
    present,
    atCapacity,
  });

  it('leaves the input array untouched', () => {
    const input = [row('Absent', false), row('Present', true)];
    sortByPresence(input);
    expect(input.map((x) => x.displayName)).toEqual(['Absent', 'Present']);
  });

  // The server's order is the tie-break, so two xolacers on the same side of
  // the presence line keep the ranking the directory already gave them.
  it('is stable within each group', () => {
    const sorted = sortByPresence([
      row('A-absent', false),
      row('B-present', true),
      row('C-absent', false),
      row('D-present', true),
    ]);
    expect(sorted.map((x) => x.displayName)).toEqual([
      'B-present',
      'D-present',
      'A-absent',
      'C-absent',
    ]);
  });

  // A capped xolacer stays visible but dimmed, and capacity is not a presence
  // signal — it must not shuffle anyone. A present-but-full xolacer still
  // outranks an absent one with space.
  it('does not move a capped xolacer', () => {
    const sorted = sortByPresence([
      row('Absent-free', false, false),
      row('Present-full', true, true),
      row('Absent-full', false, true),
      row('Present-free', true, false),
    ]);
    expect(sorted.map((x) => x.displayName)).toEqual([
      'Present-full',
      'Present-free',
      'Absent-free',
      'Absent-full',
    ]);
  });
});
