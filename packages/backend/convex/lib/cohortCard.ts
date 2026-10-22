import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { PRIMARY_EMOTIONS } from "./understandingVocab";

/**
 * The classifier's fixed primaryEmotion taxonomy (lib/understandingVocab.ts).
 * The weekly aggregate is keyed by these and nothing else — a new label there
 * means a cron change, not just a query change (ADR 0004).
 */
export const COHORT_EMOTIONS = PRIMARY_EMOTIONS;

export type CohortEmotion = (typeof COHORT_EMOTIONS)[number];

export function isCohortEmotion(e: string): e is CohortEmotion {
  return (COHORT_EMOTIONS as readonly string[]).includes(e);
}

/**
 * Returns-validator form of the taxonomy. Derived from the same array so a new
 * label can't reach the client through a stale `v.string()` — the schema's
 * record keys can't be narrowed this way (Convex record keys take no literal
 * union), but every function boundary can.
 */
export const cohortEmotionValidator = v.union(
  ...COHORT_EMOTIONS.map((e) => v.literal(e)),
);

/**
 * Below this many other campers, no number is shown. Small enough that the
 * card can appear early in the product's life, large enough that "2 campers"
 * — which reads as nobody — never ships.
 */
const COHORT_FLOOR = 3;

type CohortMatchInputs = Pick<
  Doc<"emotional_metadata">,
  "primaryEmotion" | "secondaryEmotion"
>;

/**
 * Does this session count toward a weekly cohort for `targetEmotion`? Matches
 * on primary OR secondary — the fuller shape of what was carried, not just the
 * dominant label. The single owner of that rule, so it can't drift between the
 * aggregation cron and the read-time self-exclusion, which both call this.
 *
 * Note there is NO safeguard filter here, unlike `isPoolable`. That's
 * deliberate and it is the one place this differs from peer-pool eligibility —
 * see ADR 0004. `isPoolable` gates content: someone's actual words land on a
 * stranger's screen, so a crisis session must never qualify. This gates an
 * integer. Nothing about any session is surfaced, so there is no boundary for
 * a crisis row to cross by being one of the 22.
 *
 * Deliberately says nothing about the viewer either: the per-emotion count is
 * one row shared by everyone carrying that emotion, so "not me" can't be a
 * predicate here. It's a subtraction at read time instead — see cohort.ts.
 */
export function isCohortMatch(
  s: CohortMatchInputs,
  targetEmotion: CohortEmotion,
): boolean {
  return s.primaryEmotion === targetEmotion || s.secondaryEmotion === targetEmotion;
}

export type CohortCardState =
  | { type: "count"; value: number }
  | { type: "warming" };

/**
 * Floor gate, same shape as `getReflectionRank`'s: withhold the number rather
 * than fabricate or shrink it. Below the floor the card still runs, just
 * without a count.
 */
export function deriveCohortCardState(count: number): CohortCardState {
  return count >= COHORT_FLOOR
    ? { type: "count", value: count }
    : { type: "warming" };
}

const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

/** Start (00:00 UTC) of the Monday-anchored calendar week containing `ts`. */
export function weekStartUtc(ts: number): number {
  const d = new Date(ts);
  const mondayOffset = (d.getUTCDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  return (
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
    mondayOffset * DAY_MS
  );
}
