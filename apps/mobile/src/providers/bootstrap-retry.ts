/** Retries before we conclude the row will never become active. */
export const MAX_RETRIES = 4;
export const RETRY_DELAY_MS = 800;

/** Retry attempts spent, tagged with the Clerk session that spent them. */
export type RetryBudget = {
	session: string | null | undefined;
	attempt: number;
};

/** Attempts spent against `session`; another session starts fresh, and a timer firing after
 * sign-out stamps the dead one. */
export function attemptsFor(
	budget: RetryBudget,
	session: string | null | undefined
): number {
	return budget.session === session ? budget.attempt : 0;
}
