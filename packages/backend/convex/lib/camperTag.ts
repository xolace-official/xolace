/**
 * What a xolacer calls the seeker they're paired with: `Camper` + a 4-char
 * tag. The tag is drawn at random and stored on the pair's own
 * `xolacer_conversations` row, so it names one relationship and nothing
 * wider — the same xolacer keeps seeing the same name for a returning seeker,
 * while a different xolacer pairing with that seeker sees an unrelated one.
 *
 * Pure on purpose: the charset and the collision retry are the whole of the
 * behaviour worth testing, and neither needs a database.
 * See `docs/adr/0003-random-per-pair-camper-tag.md`.
 */

/**
 * Uppercase letters and digits only — deliberately not sliced out of a Convex
 * id, whose alphabet is neither ours to rely on nor uncorrelatable.
 */
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const LENGTH = 4;

/** Guards against a caller passing an exclusion list that eats the space. */
const MAX_ATTEMPTS = 100;

function draw() {
  let tag = "";
  for (let i = 0; i < LENGTH; i++) {
    tag += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return tag;
}

/**
 * A tag none of `taken` holds. Callers pass one xolacer's other pair tags:
 * two of the same person's concurrent seekers sharing a name would be a
 * permanent, visible bug in that one inbox, while a collision across two
 * different xolacers is unobservable and, at 36^4 combinations, ~never.
 *
 * `preferred` is tried before drawing, so a row healing onto the field keeps
 * the name its xolacer has already been reading.
 */
export function generateCamperTag(
  taken: Iterable<string> = [],
  preferred?: string,
): string {
  const excluded = new Set(taken);
  if (preferred && !excluded.has(preferred)) return preferred;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tag = draw();
    if (!excluded.has(tag)) return tag;
  }
  throw new Error(`No free camper tag after ${MAX_ATTEMPTS} draws`);
}

/**
 * The tag for a pair row written before the field existed. Derived from the
 * row's own id — per-pair like the stored tag, so it carries no cross-xolacer
 * correlation — and stable, so a read in a query (which cannot write) and the
 * heal in a mutation agree on the name.
 */
export function legacyCamperTag(conversationId: string): string {
  return conversationId.slice(-LENGTH).toUpperCase();
}

/** The displayed name. One place, so the two words never drift apart. */
export function camperName(tag: string): string {
  return `Camper ${tag}`;
}

/**
 * Stream's global per-profile `user.name`. It belongs to no pairing and is
 * never rendered — every surface resolves the displayed name per conversation
 * on the client — so it holds the product's generic word for an anonymous
 * person rather than anything that could correlate one.
 */
export const GENERIC_CAMPER_NAME = "Camper";

/**
 * The tag a pair row shows: its stored one, or the legacy fallback it is
 * displayed under until it heals. Every reader — the name a xolacer sees and
 * the exclusion list a new draw avoids — goes through here, so a generated
 * tag can never collide with a legacy name already on screen.
 */
export function camperTagOf(row: { _id: string; camperTag?: string }): string {
  return row.camperTag ?? legacyCamperTag(row._id);
}
