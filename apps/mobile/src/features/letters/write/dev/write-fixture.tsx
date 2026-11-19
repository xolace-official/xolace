import { useState } from "react";
import type { LetterFor } from "../../copy";
import {
	answerOf,
	type SendOutcome,
	type WriteLimit,
} from "../../letters-model";
import {
	type LettersWrite,
	type WriteOpens,
	WriteProvider,
} from "../write-data";
import { WriteScreen } from "../write-screen";

export type WriteFixture = {
	text?: string;
	held?: string;
	limit?: WriteLimit;
	opens?: Partial<WriteOpens>;
	/** What the check answers at Send, after `checkMs`; none: it never answers. */
	outcome?: SendOutcome;
	checkMs?: number;
	/** An answer that came while Write was closed: the screen plays it as it opens. */
	late?: SendOutcome;
};

const WRITING: WriteOpens = {
	care: false,
	focus: false,
	line: null,
	reduced: null,
	stage: "edit",
};

/** The board's check takes 1–8 s; the fixtures answer in 2. */
const CHECK_MS = 2000;

/**
 * The writing screen on fixtures: the draft is this screen's state, and Send answers with the
 * fixture's outcome, so each of the check's six answers plays out with nothing sent anywhere.
 */
export function WriteFixtureScreen({ fixture }: { fixture: WriteFixture }) {
	const [text, setText] = useState(fixture.text ?? "");
	const [forWho, setForWho] = useState<LetterFor>("Anyone");
	const [held, setHeld] = useState(fixture.held ?? "");
	const [late, setLate] = useState(
		fixture.late ? answerOf(fixture.late) : null
	);
	const value: LettersWrite = {
		actions: {
			played: () => setLate(null),
			send: (draft) =>
				new Promise((resolve) => {
					const { outcome } = fixture;
					if (!outcome) {
						return;
					}
					setTimeout(() => {
						const answer = answerOf(outcome);
						if (answer.next === "rise") {
							setText("");
						}
						if (answer.next === "back" && answer.held) {
							setHeld(draft.text.trim());
						}
						resolve(answer);
					}, fixture.checkMs ?? CHECK_MS);
				}),
			setForWho,
			setText,
		},
		state: {
			checking: false,
			forWho,
			held,
			late,
			limit: fixture.limit ?? null,
			opens: { ...WRITING, ...fixture.opens },
			text,
		},
	};
	return (
		<WriteProvider value={value}>
			<WriteScreen />
		</WriteProvider>
	);
}
