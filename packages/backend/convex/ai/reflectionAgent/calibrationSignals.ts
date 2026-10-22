import type { Doc } from "../../_generated/dataModel";

// =============================================================
// TONE / CALIBRATION ADAPTATION — pure signal logic (Phase 4, Loop #1).
//
// The rule-code that turns a session window into the "what lands" prose.
// DETERMINISTIC BY DESIGN: no model call, per the constitution rule ("no
// feature may call an LLM to re-derive something the Understanding already
// knows"). Kept free of Convex ctx so it stays unit-testable; the mutation
// side lives in calibration.ts.
// =============================================================

// Below this many landed/missed outcomes the signal is noise — write nothing
// and let the profile stay quiet until there's real evidence.
const MIN_OUTCOMES = 5;
const MIN_TONE_SAMPLE = 3;
const MIN_LENGTH_SAMPLE = 3;
const MIN_MOOD_SAMPLE = 5;

// Directive thresholds — the tuning knobs for what each branch asserts.
// Confirm rate: at/above HIGH the first mirror reliably lands; at/below LOW it
// reliably misses. Between them, stay quiet.
const HIGH_CONFIRM_RATE = 0.7;
const LOW_CONFIRM_RATE = 0.4;
// Median landed length vs missed: below SHORTER → prefers tighter mirrors;
// above LONGER → prefers fuller ones.
const SHORTER_LENGTH_RATIO = 0.85;
const LONGER_LENGTH_RATIO = 1.15;
// Minimum confirm-rate gap between the top two tones to name a favourite.
const TONE_GAP = 0.2;
// Post-session mood: at/above LIGHTER → sessions usually lift; at/above HEAVIER
// → they don't reliably lift, so favour accompaniment.
const LIGHTER_MOOD_RATIO = 0.5;
const HEAVIER_MOOD_RATIO = 0.4;

type Outcome = "confirmed" | "refined" | "gave_up";

/** The raw statistical signal calibration is computed from. */
export interface CalibrationSignals {
  outcomes: Record<Outcome, number>;
  // Mirror character lengths bucketed by how they landed.
  lengthConfirmed: number[];
  lengthMissed: number[]; // refined + gave_up
  toneOutcomes: Record<string, { confirmed: number; total: number }>;
  mood: { lighter: number; same: number; heavier: number };
}

export type SessionSignalRow = Pick<
  Doc<"sessions">,
  "confirmationState" | "toneUsed" | "mirrorText" | "postSessionMood"
>;

/** Fold a session window into the calibration signal (pure). */
export function deriveCalibrationSignals(
  rows: SessionSignalRow[],
): CalibrationSignals {
  const signals: CalibrationSignals = {
    outcomes: { confirmed: 0, refined: 0, gave_up: 0 },
    lengthConfirmed: [],
    lengthMissed: [],
    toneOutcomes: {},
    mood: { lighter: 0, same: 0, heavier: 0 },
  };

  for (const row of rows) {
    const state = row.confirmationState;
    // "abandoned" carries no signal about whether the mirror landed.
    if (state === "confirmed" || state === "refined" || state === "gave_up") {
      signals.outcomes[state] += 1;

      const len = row.mirrorText?.length;
      if (typeof len === "number" && len > 0) {
        if (state === "confirmed") signals.lengthConfirmed.push(len);
        else signals.lengthMissed.push(len);
      }

      if (row.toneUsed) {
        const bucket = (signals.toneOutcomes[row.toneUsed] ??= {
          confirmed: 0,
          total: 0,
        });
        bucket.total += 1;
        if (state === "confirmed") bucket.confirmed += 1;
      }
    }

    if (
      row.postSessionMood === "lighter" ||
      row.postSessionMood === "same" ||
      row.postSessionMood === "heavier"
    ) {
      signals.mood[row.postSessionMood] += 1;
    }
  }

  return signals;
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Derive the "what lands" calibration prose from the signal (pure). Returns
 * null when there isn't enough evidence — the profile stays quiet rather than
 * asserting a preference from noise. Each line is a directive the articulator
 * can act on; middling/ambiguous signals emit nothing on purpose.
 */
export function computeCalibration(signals: CalibrationSignals): string | null {
  const { confirmed, refined, gave_up } = signals.outcomes;
  const total = confirmed + refined + gave_up;
  if (total < MIN_OUTCOMES) return null;

  const lines: string[] = [];

  // 1. How readily the first mirror lands → claim strength.
  const confirmRate = confirmed / total;
  if (confirmRate >= HIGH_CONFIRM_RATE) {
    lines.push(
      "Their first read usually lands. Trust a precise, confident mirror over a hedged one.",
    );
  } else if (confirmRate <= LOW_CONFIRM_RATE) {
    lines.push(
      "The first mirror often misses. Leave a little room and let the phrasing invite correction rather than claim certainty.",
    );
  }

  // 2. Mirror length preference — compare what landed vs what didn't.
  if (
    signals.lengthConfirmed.length >= MIN_LENGTH_SAMPLE &&
    signals.lengthMissed.length >= MIN_LENGTH_SAMPLE
  ) {
    const landed = median(signals.lengthConfirmed);
    const missed = median(signals.lengthMissed);
    if (landed < missed * SHORTER_LENGTH_RATIO) {
      lines.push("Shorter mirrors land better for them. Keep it tight.");
    } else if (landed > missed * LONGER_LENGTH_RATIO) {
      lines.push(
        "They respond to fuller mirrors with more room, not one-liners.",
      );
    }
  }

  // 3. Which tone resonates — only meaningful once tone actually varies
  //    (today toneUsed echoes the preference; Loop #2 makes it vary).
  const tones = Object.entries(signals.toneOutcomes).filter(
    ([, s]) => s.total >= MIN_TONE_SAMPLE,
  );
  if (tones.length >= 2) {
    const ranked = tones
      .map(([tone, s]) => ({ tone, rate: s.confirmed / s.total }))
      .sort((a, b) => b.rate - a.rate);
    const [best, next] = ranked;
    if (best.rate - next.rate >= TONE_GAP) {
      lines.push(`The ${best.tone} register tends to land best with them.`);
    }
  }

  // 4. Whether sessions tend to help — accompaniment vs resolution posture.
  const moodTotal =
    signals.mood.lighter + signals.mood.same + signals.mood.heavier;
  if (moodTotal >= MIN_MOOD_SAMPLE) {
    if (signals.mood.lighter / moodTotal >= LIGHTER_MOOD_RATIO) {
      lines.push("Sessions usually leave them lighter.");
    } else if (signals.mood.heavier / moodTotal >= HEAVIER_MOOD_RATIO) {
      lines.push(
        "Sessions don't reliably lift the weight; stay with them rather than trying to resolve it.",
      );
    }
  }

  return lines.length > 0 ? lines.join(" ") : null;
}
