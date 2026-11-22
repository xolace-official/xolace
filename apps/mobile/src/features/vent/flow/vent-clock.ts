import { LIT_MS, replyPace } from "@/features/vent/vent-model";

type Timer = ReturnType<typeof setTimeout>;

export type VentClock = {
	at: (ms: number, fn: () => void) => void;
	clear: () => void;
	start: () => void;
	stop: () => void;
	readonly live: boolean;
};

export function ventClock(
	schedule: (fn: () => void, ms: number) => Timer = setTimeout,
	cancel: (t: Timer) => void = clearTimeout
): VentClock {
	let pending: Timer[] = [];
	let live = true;
	const clear = () => {
		for (const t of pending) {
			cancel(t);
		}
		pending = [];
	};
	return {
		at: (ms, fn) => {
			if (live) {
				pending.push(schedule(fn, ms));
			}
		},
		clear,
		get live() {
			return live;
		},
		start: () => {
			live = true;
		},
		stop: () => {
			live = false;
			clear();
		},
	};
}

export type ReplySteps = {
	clock: VentClock;
	speak: () => Promise<number | null>;
	begin: (starts: number[]) => void;
	say: (text: string) => void;
	end: () => void;
};

export async function playReply(
	words: string[],
	steps: ReplySteps
): Promise<void> {
	const voiceMs = await steps.speak();
	if (!steps.clock.live) {
		return;
	}
	const pace = replyPace(words, voiceMs);
	steps.begin(pace.starts);
	steps.clock.at((pace.starts.at(-1) ?? 0) + LIT_MS, () =>
		steps.say(words.join(" "))
	);
	steps.clock.at(pace.ashAt, steps.end);
}
