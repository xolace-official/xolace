import { useState } from "react";
import { dropAt, firstTake, stepTake } from "./take-drop";

/**
 * Hold to speak's words (S2). A Plus (Scribe) take arrives as one block: while it listens the
 * words after what was written wait unseen; when it's kept (`takeN` counts up) they drop in. An
 * on-device take (`live`) streams its words, which show as they come and don't drop. Typing
 * after a drop ends it (`settle`). `at` is where the take starts, −1 when nothing is waiting or
 * dropping; `n` replays the drop.
 */
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
