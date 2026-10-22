/**
 * Shared runner for live-model prompt evals — Cognition Layer Phase 4, Loop #4
 * (offline eval harness). The doc's directive is to "grow the __evals__ pattern
 * to cover articulator tone rules and profile-writing before each prompt
 * change." This is that pattern, factored once so the next eval is a list of
 * labeled cases + a one-line `run` function rather than a re-implemented test
 * scaffold.
 *
 * The contract every eval here shares:
 *   - Calls the REAL model (calibration, not a unit test), so it SKIPS cleanly
 *     when ANTHROPIC_API_KEY is absent — CI without secrets stays green.
 *   - `anchor` cases are unambiguous and must be exactly right (hard assert).
 *   - Non-anchor cases feed an aggregate accuracy that must clear `threshold`;
 *     a couple of borderline misses are acceptable signal, not a failure.
 */
import { describe, expect, it } from "vitest";

/** A live eval requires the key; without it every case is a clean no-op. */
export const hasApiKey = (): boolean => !!process.env.ANTHROPIC_API_KEY;

export interface LabeledCase<E> {
  /** The correct answer for this case. */
  expected: E;
  /** Unambiguous cases that must be exactly right (not just aggregate). */
  anchor?: boolean;
  /** Human-readable description, used as the test name. */
  note: string;
}

export interface EvalOptions {
  /** Minimum aggregate accuracy across all cases. Defaults to 0.8. */
  threshold?: number;
  /** Per-case budget for the live model call. Defaults to 30s. */
  timeoutMs?: number;
}

/**
 * A live model call does not fit vitest's 5s default — a slow-but-correct
 * response would read as a failing prompt, which is the one thing an eval must
 * not do.
 */
const DEFAULT_CASE_TIMEOUT_MS = 30_000;

/**
 * Register a labeled live-model eval as a Vitest suite. Each case becomes an
 * `it`; a final `it` asserts aggregate accuracy across the set. `run` maps a
 * case to the model's actual answer; equality is strict `===` (works for the
 * boolean/string/enum outputs these evals produce).
 */
export function runLabeledEval<E, C extends LabeledCase<E>>(
  suiteName: string,
  cases: C[],
  run: (c: C) => Promise<E>,
  options: EvalOptions = {},
): void {
  const threshold = options.threshold ?? 0.8;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CASE_TIMEOUT_MS;

  describe(suiteName, () => {
    let correct = 0;

    for (const c of cases) {
      const label = `${c.anchor ? "[anchor] " : ""}${c.note}`;
      // skipIf, not an early return: a keyless run must report skips, not
      // greens — a silently-passing eval is indistinguishable from a real one.
      it.skipIf(!hasApiKey())(
        label,
        async () => {
          const got = await run(c);
          if (got === c.expected) correct++;
          // Anchors must be exactly right; non-anchors feed the aggregate.
          if (c.anchor) expect(got).toBe(c.expected);
        },
        timeoutMs,
      );
    }

    it.skipIf(!hasApiKey())(
      `aggregate accuracy across the labeled set is >= ${threshold}`,
      () => {
        expect(correct / cases.length).toBeGreaterThanOrEqual(threshold);
      },
    );
  });
}
