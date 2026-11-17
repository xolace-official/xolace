import { LIT_MS, replyPace } from "@/features/vent/vent-model";

type Timer = ReturnType<typeof setTimeout>;

/**
 * The vent's timers. Once the screen has gone (`stop`), pending timers are cancelled and new ones
 * are refused, so a step that resumes after an await can't announce, finish a vent or navigate
 * from a screen that is no longer there. `start` reopens it (React re-runs effects in development).
 */
export type VentClock = {
	at: (ms: number, fn: () => void) => void;
	/** Cancels what's pending; new timers still run. */
	clear: () => void;
	start: () => void;
	stop: () => void;
	/** The screen is still there. Check it after every await. */
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
	/** Plays the reply's voice; its length once it starts, or null without one. */
	speak: () => Promise<number | null>;
	/** The voice has started, or won't: the words light from now, at these offsets. */
	begin: (starts: number[]) => void;
	/** Reads the reply once its voice has finished, not over it. */
	say: (text: string) => void;
	/** The words burn, or (crisis) the vent finishes with its line still on screen. */
	end: () => void;
};

/**
 * The reply (§9, §10): wait for the voice, light each word as it reaches it, read the reply once
 * it's done, then burn it. Nothing happens if the screen closed while the voice was loading.
 */
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
