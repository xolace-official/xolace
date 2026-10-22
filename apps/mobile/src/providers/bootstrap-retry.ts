/** Retries before we conclude the row will never become active. */
export const MAX_RETRIES = 4;
export const RETRY_DELAY_MS = 800;

/** Retry attempts spent, tagged with the Clerk session that spent them. */
export type RetryBudget = { session: string | null | undefined; attempt: number };

/**
 * Attempts already spent against `session`. A different session — including a
 * re-sign-in after sign-out — starts fresh, so a slow sign-in that burned the
 * budget does not leave the next one with none. Tagging is also what makes a
 * retry timer that fires after sign-out harmless: it writes a budget stamped
 * with the dead session, which the next session ignores.
 *
 * See src/providers/account-bootstrap-boundary.tsx for how it is used.
 */
export function attemptsFor(
  budget: RetryBudget,
  session: string | null | undefined,
): number {
  return budget.session === session ? budget.attempt : 0;
}
