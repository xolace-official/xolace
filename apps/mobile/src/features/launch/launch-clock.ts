/**
 * When the launch cover leaves, and what happens then: timers and a store subscription, no React,
 * so `launch-clock.test.ts` runs every path on fake timers. `LaunchCover` runs one per cover and
 * passes the effects in.
 */
import {
	coverMayLeave,
	type HoldReason,
	LAUNCH_TIMING,
	type LaunchState,
} from "./launch-model";

/** The slice of the launch store the clock reads. */
type LaunchStore = {
	getState: () => LaunchState;
	subscribe: (listener: (state: LaunchState) => void) => () => void;
};

type CoverEffects = {
	/** Hides the native splash; the cover under it is the same picture. Idempotent. */
	hideNativeSplash: () => void;
	/** Native UI takes the app's light or dark. Runs before `leave`. */
	releaseNativeAppearance: () => void;
	/** The cover starts leaving: the store's `leave`, which starts the exit. */
	leave: () => void;
	/** The cover left at `maxCoverMs` with these still holding it. */
	timedOut: (holds: readonly HoldReason[]) => void;
	/**
	 * Nothing holds any more: the first screen can be used. Once per cover; `coverTimedOut` when
	 * the cover had to leave first, so time to interactive stays the real one.
	 */
	interactive: (coverTimedOut: boolean) => void;
};

/** Starts one cover's clock; returns its stop. Does nothing unless the cover is up. */
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
			// Holds from launch that outlived the cover: interactive once the last one clears.
			if (holds.length === 0) {
				becomeInteractive();
			}
			return;
		}
		if (coverMayLeave(holds, timedOut)) {
			// After the last hold, wait for loading steps that hand off across a render or two, and
			// for the first screen's frame under the cover.
			settle ??= setTimeout(leaveNow, LAUNCH_TIMING.settleMs);
		} else if (settle !== undefined) {
			// A hold came back during the settle: stay.
			clearTimeout(settle);
			settle = undefined;
		}
	};

	const timers = [
		// If the art never reports it is on screen, don't leave the native splash up.
		setTimeout(effects.hideNativeSplash, LAUNCH_TIMING.nativeHideFallbackMs),
		// Never hang: past this, whatever still loads shows its own quiet state.
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

/** What a `LaunchHold` draws: nothing under the cover; after it, the background, then a spinner. */
export const holdShows = (
	revealed: boolean,
	spinnerDue: boolean
): "nothing" | "background" | "spinner" => {
	if (!revealed) {
		return "nothing";
	}
	return spinnerDue ? "spinner" : "background";
};

/** After launch a hold's spinner is due only past `quietSpinnerAfterMs`; returns its cancel. */
export function waitForQuietSpinner(due: () => void): () => void {
	const id = setTimeout(due, LAUNCH_TIMING.quietSpinnerAfterMs);
	return () => clearTimeout(id);
}
