import { useState } from "react";
import { dropAt, firstTake, stepTake } from "./take-drop";

export function useTakeDrop(
	text: string,
	listening: boolean,
	takeN: number,
	live: boolean
) {
	const input = { listening, live, takeN, text };
	const [take, setTake] = useState(() => firstTake(input));
	const next = stepTake(take, input);
	if (next !== take) {
		setTake(next);
	}
	return {
		at: dropAt(next, text),
		n: next.n,
		settle: () => {
			if (next.dropping) {
				setTake({ ...next, dropping: false });
			}
		},
		waiting: next.listening && !next.live,
	};
}
