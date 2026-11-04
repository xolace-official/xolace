import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { usePostHog } from "posthog-react-native";
import { trackDeferredAnswered } from "@/features/intake/analytics";

type DeferredAnswer = FunctionArgs<typeof api.intake.deferred.record>["answer"];

/** The deferred questions session end asks (#712). */
type SessionEndAnswer = Extract<
	DeferredAnswer,
	{ question: "copingStyle" | "supportFrequency" }
>;

/** Saves one deferred answer, best-effort: a failed save leaves the question missing on the
 * server and the screen carries on with the answer it was given. */
export function useRecordDeferredAnswer() {
	const record = useMutation(api.intake.deferred.record);
	const posthog = usePostHog();

	return async (answer: SessionEndAnswer) => {
		try {
			const { recorded } = await record({ answer });
			if (!recorded) {
				return;
			}
			if (answer.question === "copingStyle") {
				trackDeferredAnswered(
					posthog,
					"coping_style",
					answer.copingStyle,
					"session_end"
				);
			} else {
				trackDeferredAnswered(
					posthog,
					"support_frequency",
					answer.supportFrequency,
					"notification_nudge"
				);
			}
		} catch {
			// best-effort enrichment
		}
	};
}
