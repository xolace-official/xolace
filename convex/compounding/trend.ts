/**
 * Trend (#510): steadiness now minus steadiness as of exactly 7 days ago,
 * replayed from the readings that remain — nothing stored. A domain's chip
 * shows only if it was unlocked then (never compare against a number the
 * person couldn't have seen) and has a reading since (a quiet week hides it).
 * A domain quiet 7 days ago was holding a number last fed long before, so its
 * delta is dated from that last reading instead ("since April").
 */
import type { Domain } from "../lib/understandingVocab";
import { computeSteadiness, type Reading, type SteadinessClock } from "./steadiness";

const WEEK_MS = 7 * 86_400_000;
const OVERALL_MIN_DOMAINS = 2;

export function trendFor(
  readings: Reading[],
  { now, timezone, unlocked }: SteadinessClock,
): {
  domains: Map<Domain, number>;
  overall: number | null;
  /** Domains quiet 7 days ago → their last reading then: the delta runs from there. */
  since: Map<Domain, number>;
  /** Set only when every domain read this week was quiet then: the latest of their last readings. */
  overallSince: number | null;
} {
  const then = now - WEEK_MS;
  const past = new Map(
    computeSteadiness(readings, { now: then, timezone, unlocked }).domains
      .filter((d) => d.state !== "warming")
      .map((d) => [d.domain, d]),
  );

  const domains = new Map<Domain, number>();
  // Overall averages every domain unlocked at both points: a quiet one's delta
  // is exactly 0 (silence holds), and a domain unlocking never reads as a
  // drop. Not overall now − overall then: the dial leaves quiet domains out (#535).
  const deltas: number[] = [];
  const since = new Map<Domain, number>();
  let readThisWeek = false;
  let anyLiveThen = false;
  for (const d of computeSteadiness(readings, { now, timezone, unlocked }).domains) {
    const before = past.get(d.domain);
    if (before === undefined || d.state === "warming") continue;
    const delta = d.raw.steadiness - before.raw.steadiness;
    deltas.push(delta);
    if (d.lastReadingAt > then) {
      readThisWeek = true;
      domains.set(d.domain, Math.round(delta) || 0); // no -0
      if (before.quiet) since.set(d.domain, before.lastReadingAt);
      else anyLiveThen = true;
    }
  }

  const overall =
    readThisWeek && deltas.length >= OVERALL_MIN_DOMAINS
      ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) || 0
      : null;
  const overallSince = overall !== null && !anyLiveThen ? Math.max(...since.values()) : null;
  return { domains, overall, since, overallSince };
}
