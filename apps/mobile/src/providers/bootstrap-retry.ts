export const MAX_RETRIES = 4;
export const RETRY_DELAY_MS = 800;

export type RetryBudget = {
	session: string | null | undefined;
	attempt: number;
};

export function attemptsFor(
	budget: RetryBudget,
	session: string | null | undefined
): number {
	return budget.session === session ? budget.attempt : 0;
}
