/**
 * What a report's answer does on the screen underneath. Pure: the sheet's data
 * hook sends, then lets this say whether the card folds, which toast shows and
 * whether it counts as a new report.
 */
import { COPY } from "../copy";
import { MOTION } from "../peers-look";

/** `reflections.reportReflection`'s answer, or the call failing. */
export type ReportAnswer =
	| { rateLimited?: boolean; alreadyReported?: boolean }
	| "failed";

export type ReportOutcome = {
	/** The card folds away (the report is in, now or before). */
	fold: boolean;
	toast: string;
	/** A new report: `peer_reflection_reported`. */
	track: boolean;
};

export function outcomeOf(answer: ReportAnswer): ReportOutcome {
	if (answer === "failed") {
		return { fold: false, toast: COPY.toast.failed, track: false };
	}
	if (answer.rateLimited) {
		return { fold: false, toast: COPY.toast.reportLimited, track: false };
	}
	if (answer.alreadyReported) {
		return { fold: true, toast: COPY.toast.alreadyReported, track: false };
	}
	return { fold: true, toast: COPY.toast.reported, track: true };
}

/** How long to wait before folding: never sooner than 380 ms after the pick, while the sheet goes. */
export const settleIn = (pickedAt: number, now: number) =>
	Math.max(0, MOTION.afterSheetMs - (now - pickedAt));
