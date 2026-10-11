/**
 * Trend (#510): steadiness now minus steadiness as of exactly 7 days ago,
 * replayed from the readings that remain — nothing stored. A domain's chip
 * shows only if it was unlocked then (never compare against a number the
 * person couldn't have seen) and has a reading since (a quiet week hides it).
 */
import type { Domain } from "../lib/understandingVocab";
import { computeSteadiness, type Reading, type SteadinessClock } from "./steadiness";

const WEEK_MS = 7 * 86_400_000;
const OVERALL_MIN_DOMAINS = 2;

export function trendFor(
  readings: Reading[],
  { now, timezone, unlocked }: SteadinessClock,
): { domains: Map<Domain, number>; overall: number | null } {
  const then = now - WEEK_MS;
  const past = new Map(
    computeSteadiness(readings, { now: then, timezone, unlocked }).domains
      .filter((d) => d.state !== "warming")
      .map((d) => [d.domain, d.raw.steadiness]),
  );

  const domains = new Map<Domain, number>();
  // Overall averages every domain unlocked at both points: a quiet one's delta
  // is exactly 0 (silence holds), and a domain unlocking never reads as a
  // drop. Not overall now − overall then: the dial leaves quiet domains out (#535).
  const deltas: number[] = [];
  let readThisWeek = false;
  for (const d of computeSteadiness(readings, { now, timezone, unlocked }).domains) {
    const before = past.get(d.domain);
    if (before === undefined || d.state === "warming") continue;
    const delta = d.raw.steadiness - before;
    deltas.push(delta);
    if (d.lastReadingAt > then) {
      readThisWeek = true;
      domains.set(d.domain, Math.round(delta) || 0); // no -0
    }
  }

  const overall =
    readThisWeek && deltas.length >= OVERALL_MIN_DOMAINS
      ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) || 0
      : null;
  return { domains, overall };
}
