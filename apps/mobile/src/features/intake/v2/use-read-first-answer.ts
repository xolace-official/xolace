import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import type { Reading } from "@/features/intake/v2/heard";
import type { IntakeV2State } from "@/features/intake/v2/machine";

/** Past this the pick-list stands in: the wait is a moment of attention, not a spinner. */
export const READ_TIMEOUT_MS = 12_000;

export type ReadOutcome =
	| { reading: Reading }
	| { fallback: "error" }
	/** `late` is the same read, still running: its verdict can still matter. Never rejects. */
	| { fallback: "timeout"; late: Promise<Reading | null> };

const TIMED_OUT = Symbol("timed out");

/** Never rejects: a timeout or error resolves to a fallback, so the flow has somewhere to go. */
export async function settleRead(
	start: () => Promise<Reading>
): Promise<ReadOutcome> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => resolve(TIMED_OUT), READ_TIMEOUT_MS);
	});
	try {
		const pending = start();
		const reading = await Promise.race([pending, timeout]);
		return reading === TIMED_OUT
			? {
					fallback: "timeout",
					late: pending.then(
						(late) => late,
						() => null
					),
				}
			: { reading };
	} catch (error) {
		// A ConvexError is the server saying no (rate limit, bad length), not a fault.
		if (!(error instanceof ConvexError)) {
			Sentry.captureException(error);
		}
		return { fallback: "error" };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Flux reads the answer (#708): `ai.intake.read.firstAnswer` with the answer and, once,
 * the follow-up reply.
 */
export function useReadFirstAnswer() {
	const read = useAction(api.ai.intake.read.firstAnswer);

	return (state: IntakeV2State): Promise<ReadOutcome> => {
		const { answer, followUp, followUpReply } = state;
		return settleRead(() =>
			read({
				answer,
				...(followUp && followUpReply !== null
					? {
							followUp: { question: followUp.question, reply: followUpReply },
						}
					: {}),
			})
		);
	};
}
