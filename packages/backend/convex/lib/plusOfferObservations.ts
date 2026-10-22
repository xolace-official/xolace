/**
 * The observation slot's data source: true lines about this user's own week,
 * derived from what the Understanding already holds (Cognition Layer
 * Constitution Rule — no model call for something already known).
 *
 * Pure so every line can be checked against the copy rules without a db: no
 * imagery, no number written as a digit, and nothing said that the counts
 * passed in do not support. A fabricated observation is the one thing the
 * offer card must never print (#221 §3), so every function here returns null
 * rather than reaching for a softer claim when the data is thin.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Below this a return isn't a return — it's just a couple of quiet days. */
export const PLUS_OFFER_GAP_MS = 14 * DAY_MS;

/** Sessions in a week carrying the same tag before it counts as recurrence. */
export const PLUS_OFFER_RECURRENCE_MIN = 3;

/** The two milestones #221 §4 names: a first full streak week, or a fifth night. */
export const PLUS_OFFER_STREAK_MILESTONE = 7;
export const PLUS_OFFER_SESSION_MILESTONE = 5;

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/** Copy rule 6 bans numerals in a moment card — never fall back to a digit. */
function numberWord(n: number): string {
  return WORDS[n] ?? "many";
}

/**
 * Moment 4. The gap itself is the specificity — this zone forbids the imagery
 * ("the fire remembered you") that the same beat keeps inviting.
 */
export function gapObservation(gapMs: number): string | null {
  if (gapMs < PLUS_OFFER_GAP_MS) return null;
  const days = Math.floor(gapMs / DAY_MS);
  if (days >= 60) {
    const months = Math.round(days / 30);
    return `${capitalize(numberWord(months))} months since the last one.`;
  }
  const weeks = Math.round(days / 7);
  return `${capitalize(numberWord(weeks))} weeks since the last one.`;
}

/** Moment 5. Acknowledgment, stated as the count and nothing more. */
export function milestoneObservation({
  streak,
  sessionCount,
}: {
  streak: number;
  sessionCount: number;
}): string | null {
  if (streak === PLUS_OFFER_STREAK_MILESTONE) {
    return `${capitalize(numberWord(streak))} nights running.`;
  }
  if (sessionCount === PLUS_OFFER_SESSION_MILESTONE) {
    return `${capitalize(numberWord(sessionCount))} nights now.`;
  }
  return null;
}

/**
 * Moment 3. The user's own word, handed back with its true count.
 *
 * Takes the week's tag lists rather than a db handle so the "at least three
 * separate sessions" floor is checkable here: a single session repeating a
 * word to itself is not a pattern, so tags are de-duplicated per session
 * before counting.
 */
export function patternObservation(sessionTags: string[][]): string | null {
  const counts = new Map<string, number>();
  for (const tags of sessionTags) {
    for (const tag of new Set(tags.map((t) => t.toLowerCase().trim()))) {
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  let best: [string, number] | null = null;
  for (const entry of counts) {
    if (entry[1] > (best?.[1] ?? 0)) best = entry;
  }
  if (!best || best[1] < PLUS_OFFER_RECURRENCE_MIN) return null;
  return `"${best[0]}" came back ${numberWord(best[1])} times this week.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
