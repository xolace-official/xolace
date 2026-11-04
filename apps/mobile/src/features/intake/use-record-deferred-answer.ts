import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { type PostHog, usePostHog } from "posthog-react-native";
import {
	trackAcquisitionAnswered,
	trackDeferredAnswered,
} from "@/features/intake/analytics";

/** The questions asked in the app: age moved to the Xolacer gate's date of birth (#716). */
type DeferredAnswer = Exclude<
	FunctionArgs<typeof api.intake.deferred.record>["answer"],
	{ question: "ageBracket" }
>;

/** Each question has one place it's asked (#711, #712). */
function trackAnswer(posthog: PostHog, answer: DeferredAnswer) {
	switch (answer.question) {
		case "acquisitionSource":
			trackAcquisitionAnswered(posthog, answer);
			return;
		case "copingStyle":
			trackDeferredAnswered(
				posthog,
				"coping_style",
				answer.copingStyle,
				"session_end"
			);
			return;
		case "supportFrequency":
			trackDeferredAnswered(
				posthog,
				"support_frequency",
				answer.supportFrequency,
				"notification_nudge"
			);
			return;
		default:
			throw new Error(
				`Unknown deferred question: ${JSON.stringify(answer satisfies never)}`
			);
	}
}

/** Saves one deferred answer, best-effort: a failed save leaves the question missing on the
 * server, and the asking surface carries on with the answer it was given. */
export function useRecordDeferredAnswer() {
	const record = useMutation(api.intake.deferred.record);
	const posthog = usePostHog();

	return async (answer: DeferredAnswer) => {
		try {
			const { recorded } = await record({ answer });
			if (recorded) {
				trackAnswer(posthog, answer);
			}
		} catch {
			// best-effort enrichment
		}
	};
}
