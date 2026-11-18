import { useState } from "react";

/** Where a take's words start in the text: after what was there before it and the space. */
function dropStart(before: string, text: string): number {
	if (!text.startsWith(before)) {
		return -1;
	}
	let i = before.length;
	while (i < text.length && /\s/.test(text.charAt(i))) {
		i += 1;
	}
	return i;
}

type Take = {
	before: string;
	dropping: boolean;
	listening: boolean;
	n: number;
};

/**
 * Hold to speak's words arrive as one block (S2). While listening, the words after what was
 * written wait unseen; when the take is kept (`takeN` counts up) they drop in. Typing after it
 * ends the drop (`settle`). `at` is where the take starts, −1 when nothing is waiting or
 * dropping; `n` replays the drop.
 */
export function useTakeDrop(text: string, listening: boolean, takeN: number) {
	const [take, setTake] = useState<Take>({
		before: text,
		dropping: false,
		listening,
		n: takeN,
	});
	if (listening !== take.listening || takeN !== take.n) {
		setTake({
			before: listening && !take.listening ? text : take.before,
			dropping: takeN === take.n ? take.dropping && !listening : true,
			listening,
			n: takeN,
		});
	}
	const at = listening || take.dropping ? dropStart(take.before, text) : -1;
	return {
		at,
		n: take.n,
		settle: () => {
			if (take.dropping) {
				setTake({ ...take, dropping: false });
			}
		},
		waiting: listening,
	};
}
