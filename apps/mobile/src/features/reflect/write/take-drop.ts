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

export type Take = {
	/** The text when the take started. */
	before: string;
	/** A kept one-block take is dropping in, until typing settles it. */
	dropping: boolean;
	listening: boolean;
	/** The take streams its words live (on-device dictation), so they never wait or drop. */
	live: boolean;
	n: number;
};

/** What the field reads each render: dictation's state and the take count. */
export type TakeInput = {
	text: string;
	listening: boolean;
	/** Counts each kept take. */
	takeN: number;
	/** The take in progress streams its words (on-device, a Plus fallback included). */
	live: boolean;
};

export const firstTake = ({
	text,
	listening,
	takeN,
	live,
}: TakeInput): Take => ({
	before: text,
	dropping: false,
	listening,
	live,
	n: takeN,
});

/**
 * The next take, or the same object when nothing changed. A take starting remembers the text
 * before it and whether it streams; a kept take drops in only if it was a one-block take.
 */
export function stepTake(take: Take, input: TakeInput): Take {
	const { text, listening, takeN, live } = input;
	if (listening === take.listening && takeN === take.n) {
		return take;
	}
	const starting = listening && !take.listening;
	const wasLive = starting ? live : take.live;
	let dropping = take.dropping && !listening;
	if (takeN !== take.n) {
		dropping = !wasLive;
	}
	return {
		before: starting ? text : take.before,
		dropping,
		listening,
		live: wasLive,
		n: takeN,
	};
}

/**
 * Where the unseen or dropping words start in the text, −1 for none. A Plus (Scribe) take's words
 * wait unseen while it listens, then drop in as one block (S2). An on-device take's partials
 * stream into the text as they're heard, so they show as they come.
 */
export function dropAt(take: Take, text: string): number {
	const holding = take.listening && !take.live;
	return holding || take.dropping ? dropStart(take.before, text) : -1;
}
