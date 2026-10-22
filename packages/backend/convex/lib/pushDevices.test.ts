import { describe, expect, it } from "vitest";
import {
  classifyPushDevice,
  decidePushHistoryPrune,
  PUSH_DEVICE_MAX_AGE_MS,
  PUSH_HISTORY_PRUNE_GRACE_MS,
  PUSH_SEND_SETTLE_MS,
  type PushHistoryRow,
  reconcilePushDevice,
} from "./pushDevices";

const PROFILE = "profile_a";
const OTHER = "profile_b";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe("reconcilePushDevice", () => {
  // A token nobody holds yet: nothing to clean up, nothing to reuse. This is
  // also rotation — a rotated token matches nothing and inserts, leaving the
  // device's old row for the 180-day clock in `classifyPushDevice`.
  it("inserts when no row holds the token", () => {
    expect(reconcilePushDevice([], PROFILE)).toEqual({
      keepId: null,
      deleteIds: [],
    });
  });

  // Relaunch on a device already registered — the common case, and the one
  // that must never create a second recipient.
  it("reuses this profile's existing row", () => {
    expect(
      reconcilePushDevice([{ _id: "d1", emotionalProfileId: PROFILE }], PROFILE),
    ).toEqual({ keepId: "d1", deleteIds: [] });
  });

  // The privacy fix: a reinstalled or handed-down device must not stay
  // attached to whoever held it before.
  it("takes ownership of a token held by another profile", () => {
    expect(
      reconcilePushDevice([{ _id: "d1", emotionalProfileId: OTHER }], PROFILE),
    ).toEqual({ keepId: null, deleteIds: ["d1"] });
  });

  it("keeps one row and deletes duplicates under the same profile", () => {
    expect(
      reconcilePushDevice(
        [
          { _id: "d1", emotionalProfileId: PROFILE },
          { _id: "d2", emotionalProfileId: PROFILE },
        ],
        PROFILE,
      ),
    ).toEqual({ keepId: "d1", deleteIds: ["d2"] });
  });

  it("keeps this profile's row while evicting a foreign holder", () => {
    expect(
      reconcilePushDevice(
        [
          { _id: "d1", emotionalProfileId: OTHER },
          { _id: "d2", emotionalProfileId: PROFILE },
        ],
        PROFILE,
      ),
    ).toEqual({ keepId: "d2", deleteIds: ["d1"] });
  });
});

describe("classifyPushDevice", () => {
  const recent = { lastRegisteredAt: NOW - 7 * DAY, now: NOW };

  // The whole point of the concept: no delivery history plus a recent clock is
  // a dormant device, which is exactly who the return nudge is built to reach.
  it("keeps a dormant device with no delivery history", () => {
    expect(classifyPushDevice({ latestStates: [], ...recent })).toBe("keep");
  });

  it("reaps a device whose newest notification could not be delivered", () => {
    expect(
      classifyPushDevice({ latestStates: ["unable_to_deliver"], ...recent }),
    ).toBe("dead");
  });

  // Every non-terminal state, plus the watchdog's ambiguous bucket. Reaping on
  // any of these would delete devices that are merely mid-retry.
  it.each([
    "awaiting_delivery",
    "in_progress",
    "needs_retry",
    "failed",
    "maybe_delivered",
    "delivered",
  ] as const)("keeps a device whose newest notification is %s", (state) => {
    expect(classifyPushDevice({ latestStates: [state], ...recent })).toBe(
      "keep",
    );
  });

  // Only the newest verdict counts: five rejections followed by a delivery
  // means the token started working again.
  it("ignores an older failure once something newer was delivered", () => {
    expect(
      classifyPushDevice({
        latestStates: ["delivered", "unable_to_deliver"],
        ...recent,
      }),
    ).toBe("keep");
  });

  // The rotation orphan: abandoned by a token change, never sent to, so no
  // delivery verdict will ever arrive. The clock is its only reaper.
  it("reaps an orphan with a stale clock and no history", () => {
    expect(
      classifyPushDevice({
        latestStates: [],
        lastRegisteredAt: NOW - PUSH_DEVICE_MAX_AGE_MS - 1,
        now: NOW,
      }),
    ).toBe("expired");
  });

  it("keeps a device on the day the clock threshold is reached", () => {
    expect(
      classifyPushDevice({
        latestStates: [],
        lastRegisteredAt: NOW - PUSH_DEVICE_MAX_AGE_MS,
        now: NOW,
      }),
    ).toBe("keep");
  });

  // A device can be both; the delivery verdict is the more specific answer.
  it("reports the delivery verdict ahead of the clock", () => {
    expect(
      classifyPushDevice({
        latestStates: ["unable_to_deliver"],
        lastRegisteredAt: NOW - PUSH_DEVICE_MAX_AGE_MS - 1,
        now: NOW,
      }),
    ).toBe("dead");
  });
});

describe("decidePushHistoryPrune", () => {
  const queued = NOW - DAY;

  /** Registration at `now` on a device last observed holding `rows` at `since`. */
  const decideAfter = (rows: PushHistoryRow[], since: number, now: number) =>
    decidePushHistoryPrune({
      rows,
      watch: decidePushHistoryPrune({ rows, watch: undefined, now: since })
        .watch,
      now,
    });

  it("does nothing when the device has no stored notifications", () => {
    expect(decidePushHistoryPrune({ rows: [], watch: undefined, now: NOW }))
      .toEqual({ prune: false, watch: undefined });
  });

  // First sight of a prunable history only starts the clock — nothing yet says
  // the sender that wrote these rows has finished with them.
  it("stamps a finished history instead of pruning it on first sight", () => {
    const rows: PushHistoryRow[] = [
      { state: "delivered", _creationTime: queued },
    ];
    expect(
      decidePushHistoryPrune({ rows, watch: undefined, now: NOW }),
    ).toEqual({
      prune: false,
      watch: { since: NOW, fingerprint: `${queued}:delivered` },
    });
  });

  it("prunes a finished history that has not moved since the settle window", () => {
    const rows: PushHistoryRow[] = [
      { state: "delivered", _creationTime: queued },
      { state: "unable_to_deliver", _creationTime: queued - DAY },
    ];
    expect(decideAfter(rows, NOW - PUSH_SEND_SETTLE_MS, NOW).prune).toBe(true);
  });

  // The blast radius this guard exists for: deleting a row the sender still
  // holds makes its `markNotificationState` patch a missing document, which
  // throws and takes the state update for the other 99 users in that batch
  // down with it. `awaiting_delivery` and `needs_retry` are safe from that
  // angle — only the coordinator mutation reads them — and are refused because
  // they are pushes the user has not received yet.
  it.each([
    "awaiting_delivery",
    "in_progress",
    "needs_retry",
    "failed",
  ] as const)("refuses while a row is %s, and forgets the watch", (state) => {
    const rows: PushHistoryRow[] = [{ state, _creationTime: queued }];
    expect(decideAfter(rows, NOW - 30 * DAY, NOW)).toEqual({
      prune: false,
      watch: undefined,
    });
  });

  // An older in-flight row hides behind a newer delivered one, so the newest
  // row alone is not enough to clear the history.
  it("refuses when an older row is still mid-retry", () => {
    const rows: PushHistoryRow[] = [
      { state: "delivered", _creationTime: queued },
      { state: "needs_retry", _creationTime: queued - DAY },
    ];
    expect(decideAfter(rows, NOW - 30 * DAY, NOW).prune).toBe(false);
  });

  // The watchdog parks a slow sender here and the action can still report back
  // afterwards, from outside any transaction — the one case that needs the long
  // grace rather than the short settle.
  it("holds a maybe_delivered row to the longer grace", () => {
    const rows: PushHistoryRow[] = [
      { state: "delivered", _creationTime: queued },
      { state: "maybe_delivered", _creationTime: queued - DAY },
    ];
    expect(decideAfter(rows, NOW - PUSH_SEND_SETTLE_MS, NOW).prune).toBe(false);
    expect(
      decideAfter(rows, NOW - PUSH_HISTORY_PRUNE_GRACE_MS, NOW).prune,
    ).toBe(true);
  });

  // The regression the whole shape exists for: opening the app from a
  // notification tap must not leave the history unprunable forever just because
  // the newest row is seconds old. The stamp is what the age gate used to be.
  it("prunes a history whose newest row was queued moments ago", () => {
    const rows: PushHistoryRow[] = [
      { state: "delivered", _creationTime: NOW - 1000 },
    ];
    expect(decideAfter(rows, NOW - PUSH_SEND_SETTLE_MS, NOW).prune).toBe(true);
  });

  // The bug: `_creationTime` is when a row was queued, not when it entered its
  // current state. A row that waited behind a backlog — or came back through
  // `needs_retry` — enters `delivered` already older than the settle window,
  // and an age gate on it would delete while that send's 10-second watchdog is
  // still pending.
  it("refuses a long-queued row that only just reached delivered", () => {
    const stale: PushHistoryRow[] = [
      { state: "in_progress", _creationTime: NOW - DAY },
    ];
    // Last registration saw the send still running.
    const watch = decidePushHistoryPrune({
      rows: stale,
      watch: undefined,
      now: NOW - DAY + 1000,
    }).watch;
    expect(
      decidePushHistoryPrune({
        rows: [{ state: "delivered", _creationTime: NOW - DAY }],
        watch,
        now: NOW,
      }).prune,
    ).toBe(false);
  });

  // Same hazard from the other side: the watchdog's own write is a change, so a
  // history that flips to `maybe_delivered` inside a quiet span restarts it
  // rather than inheriting the elapsed time.
  it("restarts the window when the watchdog rewrites a row", () => {
    const before: PushHistoryRow[] = [
      { state: "delivered", _creationTime: queued },
    ];
    const watch = decidePushHistoryPrune({
      rows: before,
      watch: undefined,
      now: NOW - PUSH_HISTORY_PRUNE_GRACE_MS,
    }).watch;
    const after: PushHistoryRow[] = [
      { state: "maybe_delivered", _creationTime: queued },
    ];
    expect(
      decidePushHistoryPrune({ rows: after, watch, now: NOW }),
    ).toEqual({
      prune: false,
      watch: { since: NOW, fingerprint: `${queued}:maybe_delivered` },
    });
  });

  // A notification queued and finished entirely inside the quiet span is a new
  // row, so the fingerprint moves and the elapsed time does not carry over.
  it("restarts the window when a new notification appears", () => {
    const before: PushHistoryRow[] = [
      { state: "delivered", _creationTime: queued },
    ];
    const watch = decidePushHistoryPrune({
      rows: before,
      watch: undefined,
      now: NOW - PUSH_SEND_SETTLE_MS,
    }).watch;
    expect(
      decidePushHistoryPrune({
        rows: [{ state: "delivered", _creationTime: NOW - 500 }, ...before],
        watch,
        now: NOW,
      }).prune,
    ).toBe(false);
  });
});
