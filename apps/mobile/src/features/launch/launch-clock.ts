import {
	coverMayLeave,
	type HoldReason,
	LAUNCH_TIMING,
	type LaunchState,
} from "./launch-model";

type LaunchStore = {
	getState: () => LaunchState;
	subscribe: (listener: (state: LaunchState) => void) => () => void;
};

type CoverEffects = {
	hideNativeSplash: () => void;
	releaseNativeAppearance: () => void;
	leave: () => void;
	timedOut: (holds: readonly HoldReason[]) => void;
	interactive: (coverTimedOut: boolean) => void;
};

export function runCoverClock(
	store: LaunchStore,
	effects: CoverEffects
): () => void {
	if (store.getState().phase !== "cover") {
		return () => undefined;
	}
	let timedOut = false;
	let left = false;
	let leftWithHolds = false;
	let interactive = false;
	let settle: ReturnType<typeof setTimeout> | undefined;

	const becomeInteractive = () => {
		if (!interactive) {
			interactive = true;
			effects.interactive(leftWithHolds);
		}
	};

	const leaveNow = () => {
		settle = undefined;
		const { holds } = store.getState();
		left = true;
		leftWithHolds = holds.length > 0;
		if (leftWithHolds) {
			effects.timedOut(holds);
		}
		effects.hideNativeSplash();
		effects.releaseNativeAppearance();
		effects.leave();
		if (!leftWithHolds) {
			becomeInteractive();
		}
	};

	const check = () => {
		const { holds } = store.getState();
		if (left) {
			if (holds.length === 0) {
				becomeInteractive();
			}
			return;
		}
		if (coverMayLeave(holds, timedOut)) {
			settle ??= setTimeout(leaveNow, LAUNCH_TIMING.settleMs);
		} else if (settle !== undefined) {
			clearTimeout(settle);
			settle = undefined;
		}
	};

	const timers = [
		setTimeout(effects.hideNativeSplash, LAUNCH_TIMING.nativeHideFallbackMs),
		setTimeout(() => {
			timedOut = true;
			check();
		}, LAUNCH_TIMING.maxCoverMs),
	];
	const unsubscribe = store.subscribe(check);
	check();

	return () => {
		unsubscribe();
		for (const id of timers) {
			clearTimeout(id);
		}
		if (settle !== undefined) {
			clearTimeout(settle);
		}
	};
}

export const holdShows = (
	revealed: boolean,
	spinnerDue: boolean
): "nothing" | "background" | "spinner" => {
	if (!revealed) {
		return "nothing";
	}
	return spinnerDue ? "spinner" : "background";
};

export function waitForQuietSpinner(due: () => void): () => void {
	const id = setTimeout(due, LAUNCH_TIMING.quietSpinnerAfterMs);
	return () => clearTimeout(id);
}
