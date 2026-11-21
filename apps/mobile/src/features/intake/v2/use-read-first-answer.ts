import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import type { Reading } from "@/features/intake/v2/heard";
import type { IntakeV2State } from "@/features/intake/v2/machine";

export const READ_TIMEOUT_MS = 12_000;

export type ReadOutcome =
	| { reading: Reading }
	| { fallback: "error" }
	| { fallback: "timeout"; late: Promise<Reading | null> };

const TIMED_OUT = Symbol("timed out");

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
		if (!(error instanceof ConvexError)) {
			Sentry.captureException(error);
		}
		return { fallback: "error" };
	} finally {
		clearTimeout(timer);
	}
}

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
