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
	outcome?: SendOutcome;
	checkMs?: number;
	late?: SendOutcome;
};

const WRITING: WriteOpens = {
	care: false,
	focus: false,
	line: null,
	reduced: null,
	stage: "edit",
};

const CHECK_MS = 2000;

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
