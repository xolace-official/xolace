import * as Sentry from "@sentry/react-native";
import { toast } from "@/components/shared/toast";
import { check, useCheckRunning, useUnplayedAnswer } from "../check-store";
import { LETTERS } from "../copy";
import { useKeep, useKeptField } from "../device-memory";
import { answerOf, draftAfter, type SendAnswer } from "../letters-model";
import { useLettersCalls, useLettersStatus } from "../use-letters-data";
import type { LettersWrite, WriteOpens } from "./write-data";

/** The app always opens it writing. */
const OPENS: WriteOpens = {
	care: false,
	focus: false,
	line: null,
	reduced: null,
	stage: "edit",
};

/**
 * A send that never reached the check (or outran its ceiling) comes back to the words, with
 * nothing to fix.
 */
const NOT_SENT: SendAnswer = { held: false, line: "", next: "back" };

/** The writing screen on the letters data module and the device's draft. */
export function useWrite(): LettersWrite {
	const text = useKeptField("text");
	const forWho = useKeptField("forWho");
	const held = useKeptField("held");
	const { keep, clearDraft, draftNow } = useKeep();
	const status = useLettersStatus();
	const calls = useLettersCalls();
	const checking = useCheckRunning();
	const late = useUnplayedAnswer();
	return {
		actions: {
			played: check.played,
			send: async (draft) => {
				const result = await check.run(
					async () => {
						try {
							// What's sent is trimmed, as both limits count it.
							return answerOf(
								await calls.send({ ...draft, text: draft.text.trim() })
							);
						} catch (error) {
							Sentry.captureException(error);
							toast(LETTERS.write.failed);
							return null;
						}
					},
					(answer) => {
						// The words may have changed since (Write closed and opened again mid-check).
						const change = draftAfter(answer, draft.text, draftNow());
						if (change && "clear" in change) {
							clearDraft();
						} else if (change) {
							keep({ held: change.held });
						}
					}
				);
				if (result === "busy") {
					return null;
				}
				return result === "ceiling" ? NOT_SENT : (result ?? NOT_SENT);
			},
			setForWho: (f) => keep({ forWho: f }),
			setText: (t) => keep({ text: t }),
		},
		state: {
			checking,
			forWho,
			held,
			late,
			limit: status?.writeLimit,
			opens: OPENS,
			text,
		},
	};
}
