// =============================================================
// EPISODIC MEMORY RELEVANCE FEEDBACK — Phase 4, Loop #3.
//
// Pure math for the salience weight of an episodic memory. A memory's
// weight rises when a LATER session's mirror lands with it in context,
// and falls when that mirror is given up on. The weight is mirrored into
// the RAG vector's native `importance` (0–1), which scales the memory's
// search score — so what keeps helping surfaces more, and what keeps
// missing sinks.
//
// Why a stored weight instead of reading the vector: @convex-dev/rag 0.7.5
// has NO in-place importance setter. `entryIsSame` treats an importance
// change as a different entry, so every adjustment re-embeds the composite
// (an embedding call). We therefore keep the running weight in
// `emotional_metadata.episodicImportance` — cheap, transactional, and
// durable across re-ingestion — and only pay the re-embed to apply it.
//
// FLOOR, not zero: feedback nudges salience; it never erases a memory.
// A memory that keeps missing decays toward MIN_IMPORTANCE (still
// retrievable, just deprioritized), never to 0 (which would make it
// invisible — that is deletion's job, not feedback's).
// =============================================================

export type MemoryFeedback = "confirmed" | "refined" | "gave_up" | "abandoned";

/** Weight of a memory that has never received feedback. */
export const DEFAULT_IMPORTANCE = 1;
/** A decayed memory sinks to here but stays retrievable — never erased. */
export const MIN_IMPORTANCE = 0.2;
export const MAX_IMPORTANCE = 1;
/**
 * Weight of a daily-quote reply entry (ADR 0007). Seeded, never earned and
 * never adjusted — feedback only reaches session memories. Deliberately not
 * DEFAULT_IMPORTANCE: that *is* MAX_IMPORTANCE, so a defaulted reply would sit
 * permanently at the ceiling of the profile agent's unfiltered search,
 * outranking every session memory that had ever decayed.
 */
export const REPLY_IMPORTANCE = 0.7;

// Growth is gentler than decay: a mirror that misses is stronger evidence
// the retrieved memory was noise than a single hit is that it was signal.
const BUMP = 0.1;
const DECAY = 0.15;

/**
 * How much a memory's weight moves for a given terminal confirmation state.
 * Only the two unambiguous signals move it: a clean landing rewards the
 * memories that informed it; giving up penalizes them. `refined` (landed
 * only after correction) and `abandoned` (user left) are too noisy to
 * attribute to the retrieved memories, so they leave the weight untouched.
 */
export function importanceDelta(feedback: MemoryFeedback): number {
  switch (feedback) {
    case "confirmed":
      return BUMP;
    case "gave_up":
      return -DECAY;
    default:
      return 0;
  }
}

/** Whether this feedback moves the weight at all (skip the re-embed if not). */
export function isActionableFeedback(feedback: MemoryFeedback): boolean {
  return importanceDelta(feedback) !== 0;
}

/**
 * Apply feedback to a memory's current weight, clamped to [MIN, MAX].
 * Undefined `current` means the memory has never been adjusted → starts
 * from DEFAULT_IMPORTANCE.
 */
export function adjustImportance(
  current: number | undefined,
  feedback: MemoryFeedback,
): number {
  const base = current ?? DEFAULT_IMPORTANCE;
  const next = base + importanceDelta(feedback);
  return Math.min(MAX_IMPORTANCE, Math.max(MIN_IMPORTANCE, next));
}
