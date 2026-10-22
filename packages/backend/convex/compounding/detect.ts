/**
 * Compounding (#489): a settled domain whose steadiness sits clearly below the
 * person's own baseline, across more than one day. Pure and judged by code
 * (ADR 0019); the stretch it opens is stored, not replayed (ADR 0020), so
 * these rules only ever decide the next write or a live read. Every constant
 * is a tuning knob: a change applies to open stretches from their next
 * evaluation and never rewrites a closed one.
 */
import type { Domain } from "../lib/understandingVocab";
import { localDayKey } from "../streaks/activityLog";
import {
  BASELINE_HALF_LIFE_DAYS,
  decayedMean,
  QUIET_AFTER_DAYS,
  type DomainSteadiness,
  type Reading,
  USUAL_AFTER_MS,
  usualOf,
} from "./steadiness";

const DAY_MS = 86_400_000;
// Measured in #528: 12 never caught a sustained 20-point drop on a 60–120-day
// usual; 10 does, with ~0 false opens at noise up to ±10.
const MIN_BAND = 10;
// Matches the usual's cutoff so no reading is both evidence of the drop and part of the usual.
const SIGNAL_WINDOW_MS = USUAL_AFTER_MS;
const MIN_BELOW_DAYS = 2;
const ANCHOR_CAP_MS = 90 * DAY_MS;
const SILENCE_MS = QUIET_AFTER_DAYS * DAY_MS; // the same silence that marks a score quiet
const SHARE_LONG_MS = 90 * DAY_MS;

type Clock = { now: number; timezone: string };
export type OpenStretch = { startedAt: number; anchorBaseline: number };
export type Judged =
  | { state: "compounding" | "easing"; gap: number; band: number; baseline: number }
  | { ended: "quiet" | "usual"; endedAt: number };

/**
 * How far below the usual counts as "clearly": 10 points, or one SD of how
 * this domain normally swings (CONTEXT.md "Compounding"), weighted like the
 * baseline. "Normally" is the readings older than USUAL_AFTER_MS: measured over
 * all of them, the drop widens its own band, and a steady 70 falling to 10
 * every day for two weeks never clears it (gap 18, SD 28). `since` is the
 * moment being judged: now for opening, the stretch's start while it runs, so
 * the stretch's own readings never count as the usual either.
 */
export function bandOf(d: DomainSteadiness, since: number): number {
  const usual = usualOf(d.readings, since);
  if (usual.length === 0) return MIN_BAND;
  return Math.max(MIN_BAND, decayedMean(usual, since, BASELINE_HALF_LIFE_DAYS).sd);
}

/**
 * Whether this domain opens a stretch now. Callers pass only domains the
 * landing session reading touched: self-reports never open one, and time
 * passing alone (settling, the window sliding) must not date a stretch to an
 * unrelated session.
 */
export function opens(d: DomainSteadiness, { now, timezone }: Clock): boolean {
  if (d.state !== "settled") return false;
  const baseline = d.raw.baseline;
  if (baseline - d.raw.steadiness <= bandOf(d, now)) return false;
  const belowDays = new Set(
    d.readings
      .filter((r) => r.source === "session" && r.at > now - SIGNAL_WINDOW_MS && r.value < baseline)
      .map((r) => localDayKey(r.at, timezone)),
  );
  return belowDays.size >= MIN_BELOW_DAYS;
}

/**
 * An open stretch as of `now`: still live (against its anchor for the first
 * 90 days, then the live baseline), or ended. A quiet one ended 30 days after
 * its last reading, whenever someone next looks; one back within half a band
 * of the usual ended now (hysteresis, so it can't flicker at the edge).
 */
export function judgeOpen(d: DomainSteadiness, row: OpenStretch, clock: Clock): Judged {
  const quietAt = lapsedAt(d.readings, row.startedAt, clock.now);
  if (quietAt !== null) return { ended: "quiet", endedAt: quietAt };

  const baseline =
    clock.now - row.startedAt < ANCHOR_CAP_MS ? row.anchorBaseline : d.raw.baseline;
  const band = bandOf(d, row.startedAt);
  const gap = baseline - d.raw.steadiness;
  if (gap < band / 2) return { ended: "usual", endedAt: clock.now };
  return { state: isEasing(d, clock.timezone) ? "easing" : "compounding", gap, band, baseline };
}

function lapsedAt(readings: Reading[], startedAt: number, now: number): number | null {
  // Counted from the last reading, and the one that tipped the stretch in is
  // dated at its session's start, before the stretch was written.
  let last = Math.max(0, ...readings.map((r) => r.at).filter((at) => at <= startedAt));
  for (const at of readings.map((r) => r.at).filter((at) => at > startedAt).sort((a, b) => a - b)) {
    if (at - last >= SILENCE_MS) break;
    last = at;
  }
  // A reading after a 30-day gap doesn't revive the stretch: it lapsed first.
  const next = readings.find((r) => r.at > last);
  return next || now - last >= SILENCE_MS ? last + SILENCE_MS : null;
}

/**
 * Lifting: the latest reading on each of the last two days with any sit above
 * current steadiness. A session's mood check shares its timestamp and comes
 * after it, so it is that day's latest.
 */
export function isEasing(d: DomainSteadiness, timezone: string): boolean {
  const latest = new Map<string, Reading>();
  for (const r of d.readings) {
    const day = localDayKey(r.at, timezone);
    const seen = latest.get(day);
    if (!seen || r.at >= seen.at) latest.set(day, r);
  }
  const lastTwo = [...latest.values()].sort((a, b) => b.at - a.at).slice(0, 2);
  return lastTwo.length === 2 && lastTwo.every((r) => r.value > d.raw.steadiness);
}

/** Session timestamps in a window, each marked with the domains it touched. */
function sessionsSince(readings: Reading[], since: number, now: number) {
  const sessions = new Map<number, Set<Domain>>();
  for (const r of readings) {
    if (r.source !== "session" || r.at <= since || r.at > now) continue;
    sessions.set(r.at, (sessions.get(r.at) ?? new Set()).add(r.domain));
  }
  return [...sessions.values()];
}

/**
 * Ranking only (#489): this domain's share of sessions in the last 21 days
 * minus its share over 90. Sessions are told apart by timestamp; one with no
 * scored domain makes no reading and so isn't counted.
 */
export function shareTrend(readings: Reading[], domain: Domain, now: number): number {
  const share = (ms: number) => {
    const sessions = sessionsSince(readings, now - ms, now);
    return sessions.length ? sessions.filter((s) => s.has(domain)).length / sessions.length : 0;
  };
  return share(SIGNAL_WINDOW_MS) - share(SHARE_LONG_MS);
}

/** Sessions in the last 21 days that touched both domains. */
export function sharedSessions(readings: Reading[], a: Domain, b: Domain, now: number): number {
  return sessionsSince(readings, now - SIGNAL_WINDOW_MS, now).filter((s) => s.has(a) && s.has(b))
    .length;
}
