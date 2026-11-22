import { create } from "zustand";
import type { SendAnswer } from "./letters-model";

export const CHECK_CEILING_MS = 30_000;

type CheckState = {
	running: boolean;
	unplayed: SendAnswer | null;
};

export type CheckResult = SendAnswer | null | "busy" | "ceiling";

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
		played: () => store.setState({ unplayed: null }),
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

export function useCheckRunning(): boolean {
	return check.store((c) => c.running);
}

export function useUnplayedAnswer(): SendAnswer | null {
	return check.store((c) => c.unplayed);
}
