// =============================================================
// EVAL METRICS — Cognition Layer Phase 4, Loop #4 (eval harness).
//
// The online north-star: confirmation rate per prompt/model version. The
// version-stamping discipline from every prior loop (mirrorModelVersion,
// toneUsed) pays off here — this is the pure aggregation that turns those
// stamps into a comparable quality signal, so "did the new articulator prompt
// land better than the old one?" becomes an answerable question instead of a
// vibe.
//
// This module is intentionally pure and model-free: no re-derivation, no LLM
// call (constitution rule) — it only counts terminal verdicts the pipeline
// already recorded. The Convex queries in ../evals.ts feed it rows read
// straight off the `by_model_version` / `by_date` indexes.
//
// Metric semantics (mirrors Loop #3's read of which states carry signal):
//   confirmed → the mirror landed on the first try (the thing we want).
//   refined   → it landed, but only after the user corrected it.
//   gave_up   → it never landed; the user proceeded anyway.
//   abandoned → the user left during the mirror stage. Ambiguous (a wrong
//               mirror vs. life interrupting), so it is counted and reported
//               but EXCLUDED from the quality denominators — same treatment
//               `episodicImportance` gives it (a noisy, non-actionable state).
//
// Two rates, both over the "judged" set (confirmed + refined + gave_up):
//   firstTryRate = confirmed / judged   — precision of the first read.
//   landingRate  = (confirmed+refined)/judged — did it get there at all.
// abandonRate = abandoned / total is reported separately as an engagement
// caveat, never folded into quality.
// =============================================================

export type TerminalState = "confirmed" | "refined" | "gave_up" | "abandoned";

export interface ConfirmationSample {
  /** mirrorModelVersion stamp, e.g. "articulator-v2-sonnet-5.5". */
  version: string;
  /** toneUsed for this mirror, if recorded. Lets Loop #1 be measured too. */
  tone?: string | null;
  state: TerminalState;
}

export interface VersionStats {
  /** The grouping key: a version string, a tone, or "__overall__". */
  key: string;
  confirmed: number;
  refined: number;
  gaveUp: number;
  abandoned: number;
  /** All samples in this group, including abandoned. */
  total: number;
  /** confirmed + refined + gaveUp — the set that actually judged the mirror. */
  judged: number;
  /** confirmed / judged. 0 when nothing was judged. */
  firstTryRate: number;
  /** (confirmed + refined) / judged. 0 when nothing was judged. */
  landingRate: number;
  /** abandoned / total. 0 when the group is empty. */
  abandonRate: number;
}

export interface ConfirmationSummary {
  overall: VersionStats;
  byVersion: VersionStats[];
  byTone: VersionStats[];
}

// A version needs at least this many *judged* samples before its rates are
// stable enough to rank on. Below it, a single lucky confirmation swings the
// rate wildly, so rankVersions parks such versions as "insufficient".
export const MIN_JUDGED_FOR_RANKING = 20;

const OVERALL_KEY = "__overall__";

function emptyStats(key: string): VersionStats {
  return {
    key,
    confirmed: 0,
    refined: 0,
    gaveUp: 0,
    abandoned: 0,
    total: 0,
    judged: 0,
    firstTryRate: 0,
    landingRate: 0,
    abandonRate: 0,
  };
}

function tally(stats: VersionStats, state: TerminalState): void {
  stats.total += 1;
  switch (state) {
    case "confirmed":
      stats.confirmed += 1;
      break;
    case "refined":
      stats.refined += 1;
      break;
    case "gave_up":
      stats.gaveUp += 1;
      break;
    case "abandoned":
      stats.abandoned += 1;
      break;
  }
}

// Derive the rates once counting is done. Denominators are guarded so an empty
// or all-abandoned group reports 0 rather than NaN.
function finalize(stats: VersionStats): VersionStats {
  const judged = stats.confirmed + stats.refined + stats.gaveUp;
  stats.judged = judged;
  stats.firstTryRate = judged === 0 ? 0 : stats.confirmed / judged;
  stats.landingRate = judged === 0 ? 0 : (stats.confirmed + stats.refined) / judged;
  stats.abandonRate = stats.total === 0 ? 0 : stats.abandoned / stats.total;
  return stats;
}

function groupBy(
  samples: ConfirmationSample[],
  keyOf: (s: ConfirmationSample) => string | null,
): VersionStats[] {
  const groups = new Map<string, VersionStats>();
  for (const s of samples) {
    const key = keyOf(s);
    if (key === null) continue; // e.g. a sample with no tone recorded
    let g = groups.get(key);
    if (!g) {
      g = emptyStats(key);
      groups.set(key, g);
    }
    tally(g, s.state);
  }
  return [...groups.values()].map(finalize);
}

/**
 * Fold a flat list of terminal mirror verdicts into an overall summary plus
 * per-version and per-tone breakdowns. Pure and order-independent.
 */
export function summarizeConfirmations(
  samples: ConfirmationSample[],
): ConfirmationSummary {
  const overall = emptyStats(OVERALL_KEY);
  for (const s of samples) tally(overall, s.state);
  finalize(overall);

  return {
    overall,
    byVersion: groupBy(samples, (s) => s.version),
    byTone: groupBy(samples, (s) => s.tone ?? null),
  };
}

/**
 * Rank version stats best-first by landing rate, tie-broken by first-try rate
 * (a version that lands the same fraction but needs fewer corrections is
 * better), then by judged volume (more evidence wins the final tie). Versions
 * below MIN_JUDGED_FOR_RANKING are held out as `insufficient` so a 2-sample
 * fluke never tops the board. Does not mutate the input.
 */
export function rankVersions(
  byVersion: VersionStats[],
  opts: { minJudged?: number } = {},
): { ranked: VersionStats[]; insufficient: VersionStats[] } {
  const minJudged = opts.minJudged ?? MIN_JUDGED_FOR_RANKING;
  const ranked: VersionStats[] = [];
  const insufficient: VersionStats[] = [];

  for (const v of byVersion) {
    (v.judged >= minJudged ? ranked : insufficient).push(v);
  }

  ranked.sort(
    (a, b) =>
      b.landingRate - a.landingRate ||
      b.firstTryRate - a.firstTryRate ||
      b.judged - a.judged,
  );
  // Stable, deterministic order for the parked set too (most evidence first).
  insufficient.sort((a, b) => b.judged - a.judged);

  return { ranked, insufficient };
}
