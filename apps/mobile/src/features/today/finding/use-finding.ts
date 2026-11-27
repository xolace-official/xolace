import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useRecordDeferredAnswer } from "@/lib/intake/use-record-deferred-answer";
import { useAccountFlag } from "@/store/use-account-flag";
import { type FindingAnswer, findingCardDue } from "./finding-model";

export function useFinding(now: Date) {
	const missing = useQuery(api.intake.deferred.missing);
	const completedAt = useFullContext()?.intake?.completedAt;
	const [dismissed, markDismissed] = useAccountFlag("findingCardDismissed");
	const recordAnswer = useRecordDeferredAnswer();
	const due =
		missing !== undefined &&
		completedAt !== undefined &&
		findingCardDue({ completedAt, dismissed, missing, now });
	return {
		answer: (answer: FindingAnswer) => void recordAnswer(answer),
		dismiss: markDismissed,
		due,
	};
}
