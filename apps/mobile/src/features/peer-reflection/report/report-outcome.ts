import { COPY } from "../copy";
import { MOTION } from "../peers-look";

export type ReportAnswer =
	| { rateLimited?: boolean; alreadyReported?: boolean }
	| "failed";

export type ReportOutcome = {
	fold: boolean;
	toast: string;
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

export const settleIn = (pickedAt: number, now: number) =>
	Math.max(0, MOTION.afterSheetMs - (now - pickedAt));
