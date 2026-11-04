import type { Doc } from "@xolace/backend/convex/_generated/dataModel";

export type SupportFrequency = NonNullable<
	Doc<"intake_responses">["supportFrequency"]
>;

/**
 * Whether the reminder ask follows "Does this happen a lot?" (#712). A reminder
 * only helps someone who comes back often; "Not sure" still gets the choice,
 * and the OS prompt waits on their yes either way.
 */
export function offersCheckIn(answer: SupportFrequency): boolean {
	return answer !== "occasionally";
}
