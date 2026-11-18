import * as Sentry from "@sentry/react-native";
import { toast } from "@/components/shared/toast";
import { LETTERS } from "../copy";
import { useKeep, useKeptField } from "../device-memory";
import { answerOf, type SendAnswer } from "../letters-model";
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

/** A send that never reached the check comes back to the words, with nothing to fix. */
const NOT_SENT: SendAnswer = { held: false, line: "", next: "back" };

/** The writing screen on the letters data module and the device's draft. */
export function useWrite(): LettersWrite {
	const text = useKeptField("text");
	const forWho = useKeptField("forWho");
	const held = useKeptField("held");
	const { keep, clearDraft } = useKeep();
	const status = useLettersStatus();
	const calls = useLettersCalls();
	return {
		actions: {
			send: async (draft) => {
				try {
					// What's sent is trimmed, as both limits count it.
					const outcome = await calls.send({
						...draft,
						text: draft.text.trim(),
					});
					const answer = answerOf(outcome);
					if (answer.next === "rise") {
						clearDraft();
					}
					if (answer.next === "back" && answer.held) {
						keep({ held: draft.text });
					}
					return answer;
				} catch (error) {
					Sentry.captureException(error);
					toast(LETTERS.write.failed);
					return NOT_SENT;
				}
			},
			setForWho: (f) => keep({ forWho: f }),
			setText: (t) => keep({ text: t }),
		},
		state: { forWho, held, limit: status?.writeLimit, opens: OPENS, text },
	};
}
