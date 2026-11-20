import * as Sentry from "@sentry/react-native";
import { toast } from "@/components/shared/toast";
import { check, useCheckRunning, useUnplayedAnswer } from "../check-store";
import { LETTERS } from "../copy";
import { useKeep, useKeptField } from "../device-memory";
import { isAgeRefusal, isNoSession } from "../letters-contract";
import { answerOf, draftAfter, type SendAnswer } from "../letters-model";
import { useLettersCalls, useLettersStatus } from "../use-letters-data";
import type { LettersWrite, WriteOpens } from "./write-data";

const OPENS: WriteOpens = {
	care: false,
	focus: false,
	line: null,
	reduced: null,
	stage: "edit",
};

const NOT_SENT: SendAnswer = { held: false, line: "", next: "back" };

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
							return answerOf(
								await calls.send({ ...draft, text: draft.text.trim() })
							);
						} catch (error) {
							if (isAgeRefusal(error)) {
								return null;
							}
							if (isNoSession(error)) {
								toast(LETTERS.write.noSession);
								return null;
							}
							Sentry.captureException(error);
							toast(LETTERS.write.failed);
							return null;
						}
					},
					(answer) => {
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
