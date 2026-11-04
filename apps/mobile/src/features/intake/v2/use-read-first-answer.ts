import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import type { ReadFallbackReason } from "@/features/intake/analytics";
import type { Reading } from "@/features/intake/v2/heard";
import type { IntakeV2State } from "@/features/intake/v2/machine";

/** Past this the pick-list stands in: the wait is a moment of attention, not a spinner. */
const READ_TIMEOUT_MS = 12_000;

export type ReadOutcome =
	| { reading: Reading }
	| { fallback: ReadFallbackReason };

const TIMED_OUT = Symbol("timed out");

/**
 * Flux reads the answer (#708): `ai.intake.read.firstAnswer` with the answer and, once,
 * the follow-up reply. Never rejects: a timeout or error resolves to a fallback, so the
 * flow always has somewhere to go.
 */
export function useReadFirstAnswer() {
	const read = useAction(api.ai.intake.read.firstAnswer);

	return async (state: IntakeV2State): Promise<ReadOutcome> => {
		const { answer, followUp, followUpReply } = state;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
			timer = setTimeout(() => resolve(TIMED_OUT), READ_TIMEOUT_MS);
		});
		try {
			const reading = await Promise.race([
				read({
					answer,
					...(followUp && followUpReply !== null
						? {
								followUp: { question: followUp.question, reply: followUpReply },
							}
						: {}),
				}),
				timeout,
			]);
			return reading === TIMED_OUT ? { fallback: "timeout" } : { reading };
		} catch (error) {
			// A ConvexError is the server saying no (rate limit, bad length), not a fault.
			if (!(error instanceof ConvexError)) {
				Sentry.captureException(error);
			}
			return { fallback: "error" };
		} finally {
			clearTimeout(timer);
		}
	};
}
