/**
 * The letter check, one at a time across every writing screen. It sits beside the seam
 * (`use-letters-data.ts`) and wraps its `send`, the contract's check action:
 * closing Write mid-check and opening it again mustn't send the same words twice, and an answer
 * that came back while Write was closed must still reach the writer.
 */
import { create } from "zustand";
import type { SendAnswer } from "./letters-model";

/**
 * Past this, a check that hasn't answered stops holding Write. The server's check takes 1–8 s,
 * but a Convex action sent offline stays pending until the phone is back online, and the
 * writer mustn't be locked out of Write meanwhile. If its answer comes later, it still lands
 * (the draft change, the line or care), unless another check has started since.
 */
export const CHECK_CEILING_MS = 30_000;

type CheckState = {
	/** A check is running: Send stays off on every writing screen. */
	running: boolean;
	/** An answer with something to show (a line, a held letter, care) that no screen has played. */
	unplayed: SendAnswer | null;
};

/**
 * What a check came to: its answer (null: it failed), "busy" (another check is running, so this
 * one never started) or "ceiling" (it ran past `CHECK_CEILING_MS`; Write is free again).
 */
export type CheckResult = SendAnswer | null | "busy" | "ceiling";

/** Only these leave something to show later; a pass cleared the draft, a limit is in the status. */
const worthKeeping = (answer: SendAnswer | null): answer is SendAnswer =>
	answer?.next === "back" || answer?.next === "care";

export function createCheck(ceilingMs = CHECK_CEILING_MS) {
	const store = create<CheckState>(() => ({ running: false, unplayed: null }));
	let current = 0;
	let ceiling: ReturnType<typeof setTimeout> | null = null;
	const release = () => {
		if (ceiling) {
			clearTimeout(ceiling);
		}
		ceiling = null;
		store.setState({ running: false });
	};
	return {
		/** A screen showed the answer: no reopened screen shows it again. */
		played: () => store.setState({ unplayed: null }),
		/**
		 * Runs one check. `ask` asks it (null: it failed); `settle` lands the draft change, and only
		 * then does the flag clear, so a reopened screen never draws the old words with Send on.
		 */
		run: (
			ask: () => Promise<SendAnswer | null>,
			settle: (answer: SendAnswer | null) => void
		): Promise<CheckResult> => {
			if (store.getState().running) {
				return Promise.resolve("busy");
			}
			current += 1;
			const token = current;
			store.setState({ running: true, unplayed: null });
			return new Promise((resolve) => {
				ceiling = setTimeout(() => {
					release();
					resolve("ceiling");
				}, ceilingMs);
				ask()
					.catch(() => null)
					.then((answer) => {
						// A newer check speaks for the draft now: this one's answer is dropped.
						if (token === current) {
							settle(answer);
							store.setState({
								unplayed: worthKeeping(answer) ? answer : null,
							});
							release();
						}
						resolve(answer);
					});
			});
		},
		store,
	};
}

export const check = createCheck();

/** A letter's check is running (from this or another writing screen). */
export function useCheckRunning(): boolean {
	return check.store((c) => c.running);
}

/** The answer no screen has played yet (it came while Write was closed, or mid-check). */
export function useUnplayedAnswer(): SendAnswer | null {
	return check.store((c) => c.unplayed);
}
