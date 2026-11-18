import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { toast } from "@/components/shared/toast";
import { COPY } from "../copy";
import { useFollowUpAsk } from "./follow-up-ask";
import type { FollowUpSheet } from "./follow-up-data";

/** The sheet closes first; the thanks lands once it has gone (board `answer`). */
const THANKS_AFTER_MS = 420;

/**
 * The heavier follow-up on Convex: one tap answers it (`feedback.submit`,
 * `mood_heavier`, which also starts its 24 h quiet), Not now answers nothing.
 */
export function useFollowUp(): FollowUpSheet {
	const ask = useFollowUpAsk((s) => s.ask);
	const close = useFollowUpAsk((s) => s.close);
	const submit = useMutation(api.feedback.submit);
	const posthog = usePostHog();
	const bucket = ask?.bucket ?? "mid";

	return {
		actions: {
			answer: (key) => {
				const sessionId = ask?.sessionId;
				close(key);
				if (key === null) {
					return;
				}
				setTimeout(() => toast(COPY.followUp.thanks), THANKS_AFTER_MS);
				if (sessionId) {
					submit({ selectedOption: key, sessionId, type: "mood_heavier" })
						.then(() =>
							posthog.capture("feedback_submitted", {
								has_text: false,
								intensity: bucket === "high" ? 4 : 3,
								type: "mood_heavier",
							})
						)
						.catch(() => undefined);
				}
			},
		},
		state: { open: ask !== null, question: COPY.followUp[bucket] },
	};
}
