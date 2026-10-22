import type { Specialty } from "./specialties";

/**
 * The single owner of every "should this session offer a peer listener, and
 * for what" decision. Pure — plain data in, a decision out, no db and no ctx —
 * so a future gate is added in exactly one place. Same posture as
 * `isPoolable`: the safety-critical predicate lives alone and is tested alone.
 *
 * No model call is involved at any point. Both source taxonomies (the
 * classifier's `thematicTags` and `primaryEmotion`) are closed sets, so the
 * whole mapping is static.
 */

/**
 * Arbitrary, and stated as such. The point is that a floor exists in one
 * tunable place — below it a suggestion would stop meaning anything.
 */
export const MIN_SUGGESTION_INTENSITY = 6;

/** One suggestion a week, at most. Derived from stored rows, never a field. */
export const SUGGESTION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hard suppression. Overrides any other match — routing one of these to a
 * volunteer because the session *also* tagged `family` is the single worst
 * failure this feature can produce, and it is exactly what the non-clinical
 * specialty taxonomy exists to prevent.
 */
const SUPPRESSED_THEMES = new Set(["trauma", "abuse", "neglect", "body-image"]);

/**
 * Theme wins over emotion: a specialty describes a situation someone has sat
 * with, not a feeling. "Family" tells a xolacer what conversation they are
 * walking into; "Anxiety" tells them almost nothing, because most sessions
 * have anxiety in them.
 *
 * `health`, `finances`, `achievement` and `creativity` are absent on purpose —
 * nothing on the roster listens to those, so they produce no suggestion.
 *
 * `housing` and `social-media` are absent on purpose too: no specialty listens to them.
 *
 * A Map, not an object literal: the keys are model output, and on an object a
 * tag of "constructor" or "toString" resolves to a truthy prototype member that
 * would be returned as if it were a Specialty.
 */
const THEME_SPECIALTY = new Map<string, Specialty>([
  ["work", "burnout"],
  ["burnout", "burnout"],
  ["relationships", "relationships"],
  ["conflict", "relationships"],
  ["friendships", "relationships"],
  ["romance", "relationships"],
  ["family", "family"],
  ["parenting", "family"],
  ["caregiving", "family"],
  ["identity", "identity"],
  ["self-worth", "identity"],
  ["purpose", "identity"],
  ["belonging", "identity"],
  ["change", "change"],
  ["settling-in", "change"],
  ["future", "change"],
  ["loss", "grief"],
  ["isolation", "loneliness"],
  ["sleep", "sleep"],
  ["addiction", "addiction"],
  ["studies", "studies"],
]);

/** Fallback, only consulted when no theme mapped. */
const EMOTION_SPECIALTY = new Map<string, Specialty>([
  ["anxiety", "anxiety"],
  ["stress", "anxiety"],
  ["overwhelm", "anxiety"],
  ["grief", "grief"],
  ["loneliness", "loneliness"],
  ["homesickness", "loneliness"],
  ["not-belonging", "loneliness"],
  ["exhaustion", "sleep"],
]);

/**
 * Entry modes that are a tap rather than a sentence. Nobody gets routed to a
 * stranger on the strength of a tapped word, so these never suggest.
 *
 * Keyed on the entry mode itself rather than on an empty `thematicTags`,
 * which was the obvious proxy and is wrong in both directions: the classifier
 * prompt says an empty array is *"fine"* for these modes, not required, so a
 * tapped session that did get tagged would slip through the proxy — while a
 * typed session that happened to produce no tags would be suppressed for no
 * reason. The entry mode is a fact about what the user did; the tags are a
 * model output about what it meant.
 */
const TAP_ONLY_ENTRY_TYPES = new Set(["word_cloud", "body_scan"]);

export type SuggestionInput = {
  thematicTags: string[];
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  safeguardLevel?: "none" | "gentle" | "elevated" | "crisis";
  /** How the session was entered — see TAP_ONLY_ENTRY_TYPES. */
  entryType: string;
};

/**
 * The specialty this session should offer a listener for, or null.
 *
 * `elevated` is excluded alongside `crisis` deliberately: it is the level
 * where the system already suspects something is wrong but isn't sure, which
 * is the worst possible moment to hand a person to a volunteer.
 *
 * No gate on the `specificity` score: it is a model-assigned number, and the
 * thing actually worth excluding is an entry mode, which is a fact.
 */
export function suggestedSpecialty(input: SuggestionInput): Specialty | null {
  const { thematicTags, intensity, safeguardLevel, entryType } = input;

  if (thematicTags.some((tag) => SUPPRESSED_THEMES.has(tag.toLowerCase()))) {
    return null;
  }
  if (TAP_ONLY_ENTRY_TYPES.has(entryType)) return null;
  if (safeguardLevel === "elevated" || safeguardLevel === "crisis") return null;
  if (intensity < MIN_SUGGESTION_INTENSITY) return null;

  for (const tag of thematicTags) {
    const themeMatch = THEME_SPECIALTY.get(tag.toLowerCase());
    if (themeMatch) return themeMatch;
  }

  return (
    EMOTION_SPECIALTY.get(input.primaryEmotion.toLowerCase()) ??
    EMOTION_SPECIALTY.get(input.granularLabel?.toLowerCase() ?? "") ??
    null
  );
}

/**
 * What to store on a re-classify. `resolved` is this pass's decision, `stored`
 * whatever the existing Understanding row already holds.
 *
 * An undefined `resolved` means "no suggestion on this pass", not "no
 * suggestion ever happened" — and the stored field IS the cooldown record (see
 * `isInSuggestionCooldown`; no timestamp exists). Overwriting it with undefined
 * would reopen the window for a suggestion the user has already been shown, so
 * the stored one is kept.
 *
 * The exception is a verdict `suggestedSpecialty` would itself have refused:
 * keeping a stale non-crisis suggestion on a session just classified as crisis
 * costs a crisis-flagged user being handed to a volunteer, which is worse than
 * one extra suggestion in a week.
 */
export function retainedSuggestion<T extends string>(
  resolved: T | undefined,
  stored: T | undefined,
  safeguardLevel: SuggestionInput["safeguardLevel"],
): T | undefined {
  if (safeguardLevel === "elevated" || safeguardLevel === "crisis") {
    return undefined;
  }
  return resolved ?? stored;
}

/**
 * Same number as `MIN_RATINGS_TO_DISPLAY` in xolacerChat, for the same reason —
 * below five samples an average is noise — but a separate constant because the
 * question is different: that one asks "may we show this number", this one asks
 * "may we vouch for this person". They are free to diverge.
 */
export const MIN_RATINGS_TO_JUDGE = 5;

/** Below this, with enough ratings to mean it, the app won't put its name on them. */
export const MIN_AVERAGE_RATING = 3.0;

/**
 * The exclusion that exists here and deliberately not on the roster: in a
 * suggestion *the app is vouching*, so it owes a floor. On the roster the user
 * chose for themselves.
 *
 * Unrated xolacers pass — being new is not a fault, and there is no tenure gate.
 */
export function meetsRatingFloor(xolacer: {
  ratingSum?: number;
  ratingCount?: number;
}): boolean {
  const count = xolacer.ratingCount ?? 0;
  if (count < MIN_RATINGS_TO_JUDGE) return true;
  return (xolacer.ratingSum ?? 0) / count >= MIN_AVERAGE_RATING;
}

/** FNV-1a. Deterministic and cheap; not a security primitive. */
function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Present first, then fewest open conversations, then the hash tie-break.
 * Explicitly *not* by rating: with the display threshold at five most of the
 * roster has no visible rating, so rating rank is ranking by nothing — and it
 * deadlocks. The top-rated xolacer would absorb every suggestion until they
 * hit the cap, and a new xolacer could never accumulate the ratings needed to
 * be ranked at all.
 *
 * Presence sorts ahead of open count on purpose: a present xolacer with
 * several open conversations outranks an idle absent one, because the
 * feature exists to reach someone now, and MAX_OPEN_CONVERSATIONS is still
 * what caps overload. Presence is only ever a sort term here — candidates
 * arrive already filtered to one specialty, so it can never promote someone
 * unmatched across that boundary.
 *
 * Ties are the normal case (at current roster size everyone has zero open
 * conversations), so the tie-break carries the real weight. Sorting by profile
 * id would hand every first suggestion to whoever sorts lowest; hashing against
 * the session id spreads across sessions while staying stable when the same
 * session is re-read, so the suggested name doesn't flicker.
 */
export function rankSuggestionCandidates<
  T extends { xolacerProfileId: string; openCount: number; present: boolean },
>(candidates: T[], sessionId: string): T[] {
  return [...candidates].sort(
    (a, b) =>
      Number(b.present) - Number(a.present) ||
      a.openCount - b.openCount ||
      hash32(sessionId + a.xolacerProfileId) -
        hash32(sessionId + b.xolacerProfileId),
  );
}

/**
 * How recent a session must be for a request to read as "this person came
 * here right after a session". One place, one number.
 */
export const SUGGESTION_ORIGIN_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ConversationOrigin = "suggestion" | "direct";

/**
 * What a xolacer's inbox is allowed to say about where a request came from,
 * derived from recency at request time — never from a token the client
 * happened to still be holding, which measures navigation state and would
 * badge a user who came back through the roster twenty minutes later as
 * direct.
 *
 * Accepted consequence: someone who ignored the card, browsed the roster and
 * independently picked a matching xolacer also badges as a suggestion. That
 * is correct, because the badge asserts *freshness*, not assignment — a
 * person who had a heavy burnout-shaped session an hour ago and went and
 * found a burnout listener is exactly as raw and recent.
 */
export function conversationOrigin(
  recentlySuggested: readonly string[],
  declared: readonly string[] | undefined,
): ConversationOrigin {
  const listensTo = new Set(declared ?? []);
  return recentlySuggested.some((specialty) => listensTo.has(specialty))
    ? "suggestion"
    : "direct";
}

/**
 * Has this user been offered a listener inside the cooldown window? Takes
 * already-loaded Understanding rows — the field that records *what* was
 * suggested is the same field that records *that* a suggestion happened, so
 * no timestamp is stored anywhere.
 */
export function isInSuggestionCooldown(
  recent: { createdAt: number; suggestedSpecialty?: string }[],
  now: number,
): boolean {
  return recent.some(
    (row) =>
      row.suggestedSpecialty !== undefined &&
      now - row.createdAt < SUGGESTION_COOLDOWN_MS,
  );
}
