import type { UserVariant } from '@/src/features/reflect/types';
import type { QuietReturnTier } from '@/src/features/reflect/quiet-return-copy';

type ProfileFields = {
  sessionCount: number;
  lastSessionAt?: number;
  firstSessionAt?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `streak` is getFullContext's server-derived, freeze-aware streak (#434) —
 * 0 once lapsed. Never recompute expiry here: lastSessionAt only moves on
 * reflect, so it can't see a vent/library/twig day extending the streak.
 */
export function computeUserVariant(profile: ProfileFields, streak: number): UserVariant {
  // A first-timer can hold a live streak from non-reflect days; the greeting
  // keys off `kind`, the calendar off `dayCount`.
  if (profile.sessionCount === 0) {
    return { kind: 'first-time', dayCount: streak };
  }

  if (streak === 0) {
    return { kind: 'returning' };
  }

  return { kind: 'active', dayCount: streak };
}

/**
 * Classify a returning user's gap-since-last-visit (or first-session anniversary)
 * for the Quiet Return prompt. Anniversary wins over gap tier.
 *
 * Returns null when no tier applies — first-timers, active users, and gaps
 * under 14 days all fall through to default idle copy.
 */
export function computeQuietReturn(
  profile: ProfileFields,
  now: number = Date.now(),
): QuietReturnTier | null {
  if (profile.sessionCount === 0 || !profile.lastSessionAt) {
    return null;
  }

  if (profile.firstSessionAt) {
    const anniversaryDays = Math.floor(
      (now - profile.firstSessionAt) / DAY_MS,
    );
    if (anniversaryDays >= 360 && anniversaryDays <= 380) {
      return 'anniversary';
    }
  }

  const gapDays = Math.floor((now - profile.lastSessionAt) / DAY_MS);

  if (gapDays >= 90) return 'away-90-plus';
  if (gapDays >= 30) return 'away-30-90';
  if (gapDays >= 14) return 'away-14-30';
  return null;
}
