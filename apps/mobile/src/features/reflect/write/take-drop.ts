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
	before: string;
	dropping: boolean;
	listening: boolean;
	live: boolean;
	n: number;
};

export type TakeInput = {
	text: string;
	listening: boolean;
	takeN: number;
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

export function dropAt(take: Take, text: string): number {
	const holding = take.listening && !take.live;
	return holding || take.dropping ? dropStart(take.before, text) : -1;
}
