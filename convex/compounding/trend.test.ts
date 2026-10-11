/**
 * Trend (#510): steadiness now vs exactly 7 days ago, computed on read.
 *
 * Failure modes, written before the code:
 *  1. A domain warming 7 days ago gets a chip (compares against a number the
 *     person never saw), or a domain unlocking reads as a drop overall.
 *  2. A quiet week (no reading in the last 7 days) shows "same" instead of
 *     hiding the chip.
 *  3. A tiny change shows ±0 instead of "same" (delta not rounded), or a real
 *     change is floored away.
 *  4. Readings after "7 days ago" leak into the then-score.
 *  5. The overall chip shows with under 2 qualifying domains, or in a week
 *     where nothing was read.
 *  6. The overall delta is not the mean of per-domain deltas, so a domain
 *     joining or leaving moves it.
 */
import { describe, expect, it } from "vitest";
import type { Reading } from "./steadiness";
import { trendFor } from "./trend";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);

const r = (domain: Reading["domain"], daysAgo: number, value: number): Reading => ({
  domain,
  value,
  weight: 1,
  at: NOW - daysAgo * DAY,
  source: "session",
});

/** Three session days ending 8–10 days ago: unlocked a week ago. */
const unlockedWeekAgo = (domain: Reading["domain"], value = 50) =>
  [8, 9, 10].map((d) => r(domain, d, value));

const trend = (readings: Reading[]) => trendFor(readings, { now: NOW, timezone: "UTC" });

describe("compounding/trendFor", () => {
  it("hides a domain's chip when it was still warming 7 days ago", () => {
    const out = trend([r("work", 1, 50), r("work", 2, 50), r("work", 3, 50)]);
    expect(out.domains.get("work")).toBeUndefined();
  });

  it("hides a domain's chip in a quiet week", () => {
    const out = trend(unlockedWeekAgo("work"));
    expect(out.domains.get("work")).toBeUndefined();
  });

  it("gives the honest rounded delta, ignoring later readings for the then-score", () => {
    // then: mean of three 50s = 50. now: one 90 at day 0 joins them.
    const out = trend([...unlockedWeekAgo("work"), r("work", 0, 90)]);
    const delta = out.domains.get("work");
    expect(delta).toBeGreaterThan(0);
    expect(Number.isInteger(delta)).toBe(true);
  });

  it("says 0 when the change rounds away", () => {
    const out = trend([...unlockedWeekAgo("work"), r("work", 0, 51)]);
    expect(out.domains.get("work")).toBe(0);
  });

  it("averages per-domain deltas overall, only across domains unlocked then", () => {
    const readings = [
      ...unlockedWeekAgo("work"),
      r("work", 0, 80),
      ...unlockedWeekAgo("health", 60),
      r("health", 0, 40),
      // Unlocks this week at a low score: must not drag the overall down.
      r("family", 0, 0),
      r("family", 1, 0),
      r("family", 2, 0),
    ];
    const out = trend(readings);
    const work = out.domains.get("work")!;
    const health = out.domains.get("health")!;
    expect(out.domains.has("family")).toBe(false);
    expect(Math.abs(out.overall! - (work + health) / 2)).toBeLessThanOrEqual(0.5);
  });

  it("counts a quiet unlocked domain overall as an exact 0, so overall = now − then", () => {
    const out = trend([...unlockedWeekAgo("work"), r("work", 0, 80), ...unlockedWeekAgo("health")]);
    expect(out.domains.has("health")).toBe(false);
    expect(Math.abs(out.overall! - out.domains.get("work")! / 2)).toBeLessThanOrEqual(0.5);
  });

  it("hides the overall chip under 2 domains unlocked then", () => {
    const out = trend([...unlockedWeekAgo("work"), r("work", 0, 80)]);
    expect(out.overall).toBeNull();
  });

  it("hides the overall chip when nothing was read this week", () => {
    const out = trend([...unlockedWeekAgo("work"), ...unlockedWeekAgo("health")]);
    expect(out.overall).toBeNull();
  });
});
