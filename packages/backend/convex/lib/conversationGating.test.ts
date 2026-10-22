import { describe, expect, it } from "vitest";
import {
  type BlockPlanRow,
  bothPartiesDeleted,
  canDelete,
  canManualRest,
  canRate,
  DECLINE_COOLDOWN_MS,
  declineCooldownUntil,
  hasRequestExpired,
  isArchivedFor,
  isAtOpenCap,
  isPairBlocked,
  MIN_MESSAGES_TO_RATE,
  planBlock,
  presenceDisclosed,
  REQUEST_EXPIRY_MS,
} from "./conversationGating";

type Reason = "declined" | "expired" | "blocked" | "xolacer_left";

describe("presenceDisclosed", () => {
  it("tells a live conversation who is here", () => {
    expect(presenceDisclosed("requested")).toBe(true);
    expect(presenceDisclosed("open")).toBe(true);
  });

  // The privacy half: nothing to act on means nothing to report.
  it("says nothing once the conversation is over", () => {
    expect(presenceDisclosed("resting")).toBe(false);
    expect(presenceDisclosed("closed")).toBe(false);
  });
});

describe("hasRequestExpired", () => {
  const HOUR = 60 * 60 * 1000;
  const REQUESTED = 1_000_000;

  // requestedAt + elapsed → has the sweep's span run out?
  const cases: { elapsed: number; expected: boolean; label: string }[] = [
    { elapsed: 0, expected: false, label: "just sent" },
    {
      elapsed: REQUEST_EXPIRY_MS - 1,
      expected: false,
      label: "one tick early",
    },
    {
      elapsed: REQUEST_EXPIRY_MS,
      expected: true,
      label: "exactly at the span",
    },
    { elapsed: REQUEST_EXPIRY_MS + 1, expected: true, label: "one tick late" },
  ];

  for (const c of cases) {
    it(`${c.label} → ${c.expected}`, () => {
      expect(hasRequestExpired(REQUESTED, REQUESTED + c.elapsed)).toBe(
        c.expected,
      );
    });
  }

  // The span itself, so shortening it from a week is a deliberate edit rather
  // than something a refactor can slide back. Written as hours because that is
  // the unit the decision was made in.
  it("waits two days, not a week", () => {
    expect(REQUEST_EXPIRY_MS).toBe(48 * HOUR);
  });

  // Clock skew between the sweep's `now` and a row's stamp must not expire a
  // request that has not happened yet.
  it("never expires a request stamped in the future", () => {
    expect(hasRequestExpired(REQUESTED, REQUESTED - HOUR)).toBe(false);
  });
});

describe("declineCooldownUntil", () => {
  const DECLINED = 1_000_000;
  const OPEN_AGAIN = DECLINED + DECLINE_COOLDOWN_MS;

  // row state | now → when the pair may ask again, or undefined for "now"
  const cases: {
    status?: "requested" | "open" | "resting" | "closed";
    reason?: Reason;
    declinedAt?: number;
    now: number;
    expected?: number;
    label: string;
  }[] = [
    // The loop this exists to break: declined, asked again the same hour.
    {
      status: "closed",
      reason: "declined",
      declinedAt: DECLINED,
      now: DECLINED + 3_600_000,
      expected: OPEN_AGAIN,
      label: "declined an hour ago",
    },
    {
      status: "closed",
      reason: "declined",
      declinedAt: DECLINED,
      now: OPEN_AGAIN - 1,
      expected: OPEN_AGAIN,
      label: "one tick before the window closes",
    },
    // The genuine second attempt has to still work.
    {
      status: "closed",
      reason: "declined",
      declinedAt: DECLINED,
      now: OPEN_AGAIN,
      label: "exactly at the boundary",
    },
    // Expiry is silence, not a refusal — no cooldown, whatever the stamp says.
    {
      status: "closed",
      reason: "expired",
      declinedAt: DECLINED,
      now: DECLINED + 1,
      label: "expired rather than declined",
    },
    // Blocked has its own, permanent refusal upstream; it must not read as a
    // timed one that expires into a reopened door.
    {
      status: "closed",
      reason: "blocked",
      declinedAt: DECLINED,
      now: DECLINED + 1,
      label: "blocked",
    },
    // Rows declined before the stamp existed wait for nothing.
    {
      status: "closed",
      reason: "declined",
      now: DECLINED + 1,
      label: "declined with no stamp (grandfathered)",
    },
    // A re-request already through the door reopens this row — status is what
    // says so, and a stale declinedAt must not gate the live request.
    {
      status: "requested",
      declinedAt: DECLINED,
      now: DECLINED + 1,
      label: "re-requested, stamp still on the row",
    },
    { now: DECLINED, label: "no row at all" },
  ];

  for (const c of cases) {
    it(`${c.label} → ${c.expected ?? "may ask now"}`, () => {
      expect(
        declineCooldownUntil(
          c.status === undefined
            ? null
            : {
                status: c.status,
                closedReason: c.reason,
                declinedAt: c.declinedAt,
              },
          c.now,
        ),
      ).toBe(c.expected as number);
    });
  }
});

describe("isPairBlocked", () => {
  // forward row | reverse row → is the pair closed?
  const cases: {
    forward?: Reason | null;
    reverse?: Reason | null;
    expected: boolean;
    label: string;
  }[] = [
    { expected: false, label: "neither direction was ever opened" },
    {
      forward: "blocked",
      expected: true,
      label: "forward pairing blocked",
    },
    // The regression this predicate exists for: A blocked B on the row where A
    // asked, so B must not be able to open the row where B asks.
    {
      reverse: "blocked",
      expected: true,
      label: "reverse pairing blocked",
    },
    // A decline or an expiry is not a block — the seeker may come back.
    {
      forward: "declined",
      reverse: "expired",
      expected: false,
      label: "closed for a non-blocked reason",
    },
  ];

  for (const c of cases) {
    it(`${c.label}: forward=${c.forward} reverse=${c.reverse} → ${c.expected}`, () => {
      expect(
        isPairBlocked(
          c.forward === undefined
            ? undefined
            : { closedReason: c.forward ?? undefined },
          c.reverse === undefined
            ? undefined
            : { closedReason: c.reverse ?? undefined },
        ),
      ).toBe(c.expected);
    });
  }
});

describe("isAtOpenCap", () => {
  const SEEKER_CAP = 3;

  // openCount | cap → is this party full?
  const cases: { open: number; cap: number; expected: boolean }[] = [
    { open: 2, cap: SEEKER_CAP, expected: false },
    { open: 3, cap: SEEKER_CAP, expected: true },
    // Grandfathered seekers from before the cap existed: still full, never
    // negative-space back under it.
    { open: 5, cap: SEEKER_CAP, expected: true },
  ];

  for (const c of cases) {
    it(`open=${c.open} cap=${c.cap} → ${c.expected}`, () => {
      expect(isAtOpenCap(c.open, c.cap)).toBe(c.expected);
    });
  }
});

describe("planBlock", () => {
  type Row = { id: string; reason?: Reason; channel?: string };
  const row = (r: Row | undefined): BlockPlanRow | undefined =>
    r === undefined
      ? undefined
      : {
          _id: r.id as BlockPlanRow["_id"],
          closedReason: r.reason,
          streamChannelId: r.channel,
        };

  // forward row | reverse row → noop, channels to freeze, rows to close
  const cases: {
    forward?: Row;
    reverse?: Row;
    noop: boolean;
    freeze: string[];
    close: string[];
    label: string;
  }[] = [
    // The regression this ticket exists for: a pair holding two open rows must
    // lose both, or they keep messaging through the sibling.
    {
      forward: { id: "f", channel: "ch_f" },
      reverse: { id: "r", channel: "ch_r" },
      noop: false,
      freeze: ["ch_f", "ch_r"],
      close: ["f", "r"],
      label: "both rows open",
    },
    // A still-`requested` sibling has no channel, but must still close — a
    // live invitation from the person just blocked cannot survive.
    {
      forward: { id: "f", channel: "ch_f" },
      reverse: { id: "r" },
      noop: false,
      freeze: ["ch_f"],
      close: ["f", "r"],
      label: "sibling requested, no channel",
    },
    // `closedReason` is a gate input, not an audit log: a declined sibling
    // left unblocked is a way back in.
    {
      forward: { id: "f", channel: "ch_f" },
      reverse: { id: "r", reason: "declined", channel: "ch_r" },
      noop: false,
      freeze: ["ch_f", "ch_r"],
      close: ["f", "r"],
      label: "sibling closed for another reason is overwritten",
    },
    {
      forward: { id: "f", channel: "ch_f" },
      noop: false,
      freeze: ["ch_f"],
      close: ["f"],
      label: "only one row present",
    },
    {
      forward: { id: "f" },
      noop: false,
      freeze: [],
      close: ["f"],
      label: "only one row, requested",
    },
    // Retry after a network failure, or a double-tap — no error, no Stream call.
    {
      forward: { id: "f", reason: "blocked", channel: "ch_f" },
      reverse: { id: "r", channel: "ch_r" },
      noop: true,
      freeze: [],
      close: [],
      label: "already blocked on the forward row",
    },
    {
      forward: { id: "f", channel: "ch_f" },
      reverse: { id: "r", reason: "blocked", channel: "ch_r" },
      noop: true,
      freeze: [],
      close: [],
      label: "already blocked on the reverse row",
    },
  ];

  for (const c of cases) {
    it(`${c.label} → noop=${c.noop} freeze=[${c.freeze}] close=[${c.close}]`, () => {
      const plan = planBlock({
        forward: row(c.forward),
        reverse: row(c.reverse),
      });
      expect(plan.noop).toBe(c.noop);
      expect(plan.channelsToFreeze).toEqual(c.freeze);
      expect(plan.rowsToClose).toEqual(c.close as never[]);
    });
  }
});

describe("canRate", () => {
  const ACCEPTED = 1_000;
  const AFTER = 2_000;
  const ENOUGH = MIN_MESSAGES_TO_RATE;

  // role | closedReason | exchange | messages → rateable
  const cases: {
    role: "user" | "xolacer";
    reason?: "declined" | "expired" | "blocked" | "xolacer_left";
    acceptedAt?: number;
    lastMessageAt?: number;
    messageCount?: number;
    expected: boolean;
    label?: string;
  }[] = [
    {
      role: "user",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      messageCount: ENOUGH,
      expected: true,
    },
    // A closed conversation is still rateable — only a block isn't.
    {
      role: "user",
      reason: "xolacer_left",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      messageCount: ENOUGH,
      expected: true,
    },
    // The xolacer never rates the people who come to them.
    {
      role: "xolacer",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      messageCount: ENOUGH,
      expected: false,
    },
    // Accepted then ignored: the handshake stamp is the only timestamp.
    {
      role: "user",
      acceptedAt: ACCEPTED,
      lastMessageAt: ACCEPTED,
      messageCount: ENOUGH,
      expected: false,
    },
    { role: "user", expected: false },
    // One tick under the threshold.
    {
      role: "user",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      messageCount: ENOUGH - 1,
      expected: false,
    },
    // Predates the counter: absent reads as 0, and is not backfilled.
    {
      role: "user",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      expected: false,
    },
    // safety rows: a blocked conversation never rates, whatever else is true
    {
      role: "user",
      reason: "blocked",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      messageCount: ENOUGH,
      expected: false,
      label: "safety",
    },
    {
      role: "xolacer",
      reason: "blocked",
      acceptedAt: ACCEPTED,
      lastMessageAt: AFTER,
      messageCount: ENOUGH,
      expected: false,
      label: "safety",
    },
  ];

  for (const c of cases) {
    const name = `${c.label ? `${c.label}: ` : ""}role=${c.role} closedReason=${c.reason} accepted=${c.acceptedAt} last=${c.lastMessageAt} messages=${c.messageCount} → ${c.expected}`;
    it(name, () => {
      expect(
        canRate(
          {
            closedReason: c.reason,
            acceptedAt: c.acceptedAt,
            lastMessageAt: c.lastMessageAt,
            messageCount: c.messageCount,
          },
          c.role,
        ),
      ).toBe(c.expected);
    });
  }
});

describe("isArchivedFor", () => {
  const REQUESTED = 1_000_000;
  const ARCHIVED = REQUESTED + 1000;

  it("hides the row for the side that archived it, and only that side", () => {
    const row = { requestedAt: REQUESTED, archivedByUserAt: ARCHIVED };
    expect(isArchivedFor(row, "user", ARCHIVED + 1)).toBe(true);
    expect(isArchivedFor(row, "xolacer", ARCHIVED + 1)).toBe(false);
  });

  it("reads as not archived when nobody archived it", () => {
    const row = { requestedAt: REQUESTED };
    expect(isArchivedFor(row, "user", ARCHIVED)).toBe(false);
    expect(isArchivedFor(row, "xolacer", ARCHIVED)).toBe(false);
  });

  // The whole point of computing this at read time: activity un-archives.
  const activity = [
    { field: "lastMessageAt", label: "a new message" },
    { field: "acceptedAt", label: "an accept" },
    { field: "declinedAt", label: "a decline" },
  ] as const;

  for (const { field, label } of activity) {
    it(`${label} after the stamp brings the row back`, () => {
      expect(
        isArchivedFor(
          {
            requestedAt: REQUESTED,
            archivedByUserAt: ARCHIVED,
            [field]: ARCHIVED + 1,
          },
          "user",
          ARCHIVED + 2,
        ),
      ).toBe(false);
    });

    it(`${label} before the stamp leaves it archived`, () => {
      expect(
        isArchivedFor(
          {
            requestedAt: REQUESTED,
            archivedByUserAt: ARCHIVED,
            [field]: ARCHIVED - 1,
          },
          "user",
          ARCHIVED + 2,
        ),
      ).toBe(true);
    });
  }

  // A re-request rewrites `requestedAt`, which is a status change like any other.
  it("brings the row back when it is re-requested after the stamp", () => {
    expect(
      isArchivedFor(
        { requestedAt: ARCHIVED + 1, archivedByUserAt: ARCHIVED },
        "user",
        ARCHIVED + 2,
      ),
    ).toBe(false);
  });
});

describe("canManualRest", () => {
  const statuses = ["requested", "open", "resting", "closed"] as const;

  for (const status of statuses) {
    it(`xolacer, status=${status} → ${status === "open"}`, () => {
      expect(canManualRest({ status }, "xolacer")).toBe(status === "open");
    });

    // Seekers have archive; there is no seeker-facing close.
    it(`seeker, status=${status} → false`, () => {
      expect(canManualRest({ status }, "user")).toBe(false);
    });
  }
});

describe("canDelete", () => {
  const statuses = ["requested", "open", "resting", "closed"] as const;
  const reasons = [
    undefined,
    "declined",
    "expired",
    "blocked",
    "xolacer_left",
  ] as const;

  for (const status of statuses) {
    for (const closedReason of reasons) {
      const expected =
        status === "closed" &&
        (closedReason === "declined" || closedReason === "expired");
      it(`status=${status} closedReason=${closedReason} → ${expected}`, () => {
        expect(canDelete({ status, closedReason })).toBe(expected);
      });
    }
  }
});

describe("bothPartiesDeleted", () => {
  it("purges only once both sides are done", () => {
    expect(
      bothPartiesDeleted({ deletedByUser: true, deletedByXolacer: true }),
    ).toBe(true);
  });

  it("keeps the row while either side still holds a copy", () => {
    expect(bothPartiesDeleted({ deletedByUser: true })).toBe(false);
    expect(bothPartiesDeleted({ deletedByXolacer: true })).toBe(false);
    expect(bothPartiesDeleted({})).toBe(false);
    expect(
      bothPartiesDeleted({ deletedByUser: true, deletedByXolacer: false }),
    ).toBe(false);
  });
});
