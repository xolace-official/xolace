/**
 * Clock-driven copy for the discovery masthead. Pure functions, no state —
 * the screen re-renders on focus, which is often enough for a day part.
 */

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'late';

export function getDayPart(now = new Date()): DayPart {
  const hour = now.getHours();
  if (hour < 5) return 'late';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late';
}

/** Eyebrow datestamp — "Tuesday · evening". Rendered uppercase + tracked. */
export function getDateStamp(now = new Date()): string {
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  return `${weekday} · ${getDayPart(now)}`;
}

/**
 * Quiet, non-time-worded greeting so it doesn't echo the eyebrow above it.
 * Takes the preferences displayName (same source as the profile screen), not
 * the Clerk account name.
 */
export function getGreeting(displayName?: string | null): string {
  return displayName ? `Welcome back, ${displayName}` : 'Welcome back';
}

/**
 * Masthead display copy. Split lead/tail so the tail can drop to a lighter
 * weight — the reference's trick for giving a type block internal rhythm.
 *
 * Copy only — it does not navigate. Xolacer setup is gated on `isXolacer`,
 * so it is not the destination; this stays inert until there is one.
 */
export const DISPLAY_LINES = [
  { lead: 'Be the support someone needs.', tail: 'Become a Xolacer.' },
  { lead: 'Listen. Connect. Support.', tail: 'Become a Xolacer.' },
  { lead: 'Your story, your empathy, your impact.', tail: 'Become a Xolacer.' },
  { lead: 'Make space for someone to be heard.', tail: 'Become a Xolacer.' },
  { lead: 'Someone needs a safe space.', tail: 'You could help create it.' },
] as const;

const ACTIVE_LINE = 3;

export const DISPLAY_LEAD = DISPLAY_LINES[ACTIVE_LINE].lead;
export const DISPLAY_TAIL = DISPLAY_LINES[ACTIVE_LINE].tail;
