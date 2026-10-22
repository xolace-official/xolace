/**
 * Compounding rules (#489), pure. The storage seam is stretches.test.ts.
 *
 * Failure modes, written before the code:
 *  1. One heavy night opens a stretch (needs below-baseline session readings
 *     on 2+ distinct days in 21).
 *  2. Self-reports count toward those two days.
 *  3. A wobble under 10 points fires, or a domain that always swings wide
 *     fires on its normal swing (band = max(10, 1 SD)).
 *  4. A domain compounds before it is settled.
 *  5. A drop that stays above the usual fires.
 *  6. Flicker: a stretch closes the moment the gap dips under the band
 *     instead of under half of it.
 *  7. The anchor drifts with the live baseline, or holds past 90 days.
 *  8. Silence: a stretch stays live after 30 quiet days, or its end is dated
 *     at the next evaluation instead of last reading + 30 days.
 *  9. Easing fires on one lifted reading, or on two from the same day.
 * 10. Share trend counts readings instead of sessions, or ignores the window.
 * 11. The usual includes lately, so it sinks with a sustained drop and the
 *     drop never clears the band (#527).
 */
import { describe, expect, it } from "vitest";
import { bandOf, isEasing, judgeOpen, opens, sharedSessions, shareTrend } from "./detect";
import { computeSteadiness, type DomainSteadiness, type Reading } from "./steadiness";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);
const TZ = "UTC";

const r = (daysAgo: number, value: number, o: Partial<Reading> = {}): Reading => ({
  domain: "work",
  value,
  weight: 1,
  at: NOW - daysAgo * DAY,
  source: "session",
  ...o,
});

/** A settled usual of `value`: a session every other day from 120 to 22 days ago. */
const usual = (value = 70, o: Partial<Reading> = {}) =>
  Array.from({ length: 50 }, (_, i) => r(120 - i * 2, value, o));

/** A heavy week: one session a day for the last `days` days. */
const heavy = (days: number, value = 10, o: Partial<Reading> = {}) =>
  Array.from({ length: days }, (_, i) => r(i + 0.5, value, o));

const work = (readings: Reading[], now = NOW): DomainSteadiness => {
  const d = computeSteadiness(readings, { now, timezone: TZ }).domains.find(
    (x) => x.domain === "work",
  );
  if (!d) throw new Error("no work domain");
  return d;
};

const at = { now: NOW, timezone: TZ };

describe("opens", () => {
  it("opens on a settled domain clearly below its usual on 2+ days", () => {
    expect(opens(work([...usual(), ...heavy(8)]), at)).toBe(true);
  });

  it("never on one heavy night, however heavy (1)", () => {
    const night = [r(0.5, 0), r(0.4, 0), r(0.3, 0), r(0.2, 0), r(0.1, 0)];
    const d = work([...usual(), ...night]);
    expect(d.raw.baseline - d.raw.steadiness).toBeGreaterThan(10); // the gap alone would fire
    expect(opens(d, at)).toBe(false);
  });

  it("never when only self-reports sit below on a second day (2)", () => {
    const night = [r(0.5, 0), r(0.4, 0), r(0.3, 0), r(0.2, 0), r(0.1, 0)];
    const moods = heavy(8, 0, { source: "mood" }).map((m) => ({ ...m, at: m.at - DAY }));
    expect(opens(work([...usual(), ...night, ...moods]), at)).toBe(false);
  });

  it("measures the band on the usual, so the drop can't widen its own (3)", () => {
    expect(bandOf(work([...usual(), ...heavy(8)]), NOW)).toBe(10);
  });

  it("never on a wobble inside 10 points (3)", () => {
    expect(opens(work([...usual(), ...heavy(20, 60)]), at)).toBe(false);
  });

  it("never on a wide swinger's normal swing (3)", () => {
    const swings = usual().map((x, i) => ({ ...x, value: i % 2 ? 10 : 100 }));
    const d = work([...swings, ...heavy(6)]);
    expect(d.raw.baseline - d.raw.steadiness).toBeGreaterThan(10);
    expect(opens(d, at)).toBe(false);
  });

  it("never before settled (4)", () => {
    expect(opens(work([r(19, 70), r(18, 70), r(17, 70), ...heavy(8)]), at)).toBe(false);
  });

  it("never on a drop that stays above the usual (5)", () => {
    const high = Array.from({ length: 10 }, (_, i) => r(20 - i, 100));
    const d = work([...usual(50), ...high, ...heavy(4, 60)]);
    expect(opens(d, at)).toBe(false);
  });
});

describe("the usual excludes lately (11)", () => {
  /** Steady daily sessions for `history` days, then a daily `drop`: the first day it opens. */
  const firstOpenDay = (history: number, steady: number, drop: number) => {
    const start = NOW - 60 * DAY;
    const before = Array.from({ length: history }, (_, i) => ({ ...r(0, steady), at: start - (i + 0.5) * DAY }));
    for (let day = 1; day <= 60; day++) {
      const after = Array.from({ length: day }, (_, i) => ({ ...r(0, steady + drop), at: start + (i + 0.5) * DAY }));
      const now = start + day * DAY;
      if (opens(work([...before, ...after], now), { now, timezone: TZ })) return day;
    }
    return null;
  };

  it("a long usual dropping 30 opens within ~16 days", () => {
    const day = firstOpenDay(120, 70, -30);
    expect(day).not.toBeNull();
    expect(day!).toBeLessThanOrEqual(16);
  });

  it("a just-settled usual dropping 60 opens within days", () => {
    const day = firstOpenDay(21, 70, -60);
    expect(day).not.toBeNull();
    expect(day!).toBeLessThanOrEqual(4);
  });

  it("a long usual dropping 20 opens within ~3 weeks (#528)", () => {
    const day = firstOpenDay(120, 70, -20);
    expect(day).not.toBeNull();
    expect(day!).toBeLessThanOrEqual(21);
  });

  it("a 10-point dip never opens", () => {
    expect(firstOpenDay(120, 70, -10)).toBeNull();
  });
});

describe("judgeOpen", () => {
  const started = (daysAgo: number, anchorBaseline: number) => ({
    startedAt: NOW - daysAgo * DAY,
    anchorBaseline,
  });

  it("holds through the band and closes only under half of it (6)", () => {
    const d = work([...usual(), ...heavy(8)]);
    const band = bandOf(d, NOW - 5 * DAY);
    const gapOf = (anchor: number) => anchor - d.raw.steadiness;
    const inside = d.raw.steadiness + band * 0.75; // under the band, over half
    expect(gapOf(inside)).toBeLessThan(band);
    expect(judgeOpen(d, started(5, inside), at)).toMatchObject({ gap: gapOf(inside) });
    expect(judgeOpen(d, started(5, d.raw.steadiness + band * 0.4), at)).toEqual({
      ended: "usual",
      endedAt: NOW,
    });
  });

  it("keeps a long stretch's own lows out of its band (3)", () => {
    const d = work([...usual(), ...heavy(40)]);
    expect(bandOf(d, NOW)).toBeGreaterThan(10); // the drop, measured as the usual
    expect(judgeOpen(d, started(39, 95), at)).toMatchObject({ band: 10 });
  });

  it("judges against the stored anchor, not the live baseline (7)", () => {
    const d = work([...usual(), ...heavy(8)]);
    expect(judgeOpen(d, started(10, 95), at)).toMatchObject({ gap: 95 - d.raw.steadiness });
  });

  it("releases the anchor after 90 days (7)", () => {
    const d = work([...usual(), ...heavy(8)]);
    const judged = judgeOpen(d, started(91, 95), at);
    expect(judged).toMatchObject({ gap: d.raw.baseline - d.raw.steadiness });
  });

  it("lapses 30 days after the last reading, dated then (8)", () => {
    const readings = [...usual(), ...heavy(8)].map((x) => ({ ...x, at: x.at - 40 * DAY }));
    const d = work(readings);
    const startedAt = NOW - 41 * DAY;
    expect(judgeOpen(d, { startedAt, anchorBaseline: 90 }, at)).toEqual({
      ended: "quiet",
      endedAt: NOW - 40.5 * DAY + 30 * DAY,
    });
  });

  it("lapses even when a reading has since come back after a gap (8)", () => {
    const readings = [...usual(), ...heavy(8)].map((x) => ({ ...x, at: x.at - 40 * DAY }));
    const d = work([...readings, r(0, 10)]);
    expect(judgeOpen(d, { startedAt: NOW - 41 * DAY, anchorBaseline: 90 }, at)).toMatchObject({
      ended: "quiet",
    });
  });
});

describe("isEasing", () => {
  it("eases when the last two days both sit above steadiness (9)", () => {
    // Only today lifted: yesterday still sat at 10.
    expect(isEasing(work([...usual(), ...heavy(8), r(0.2, 80)]), TZ)).toBe(false);
    const lifted = [...usual(), ...heavy(8, 10).map((x) => ({ ...x, at: x.at - 2 * DAY })), r(1, 80), r(0, 80)];
    expect(isEasing(work(lifted), TZ)).toBe(true);
  });

  it("never on two lifted readings from the same day (9)", () => {
    const sameDay = [...usual(), ...heavy(8).map((x) => ({ ...x, at: x.at - 2 * DAY })), r(0.2, 80), r(0.1, 80)];
    expect(isEasing(work(sameDay), TZ)).toBe(false);
  });
});

describe("shareTrend and links", () => {
  it("is the 21-day share of sessions minus the 90-day share (10)", () => {
    const readings = [
      r(60, 50, { domain: "family" }),
      r(50, 50, { domain: "family" }),
      r(5, 50),
      r(5, 50, { domain: "family" }), // one session, two domains
      r(5, 30, { source: "mood" }),
      r(3, 50),
    ];
    // 21d: 2 sessions, both work → 1. 90d: 4 sessions, 2 work → 0.5.
    expect(shareTrend(readings, "work", NOW)).toBeCloseTo(0.5);
  });

  it("counts sessions both domains came up in, inside 21 days", () => {
    const readings = [r(30, 50), r(30, 50, { domain: "family" }), r(2, 50), r(2, 50, { domain: "family" }), r(1, 50)];
    expect(sharedSessions(readings, "work", "family", NOW)).toBe(1);
  });
});
