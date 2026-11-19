import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import { holdShows, runCoverClock, waitForQuietSpinner } from "./launch-clock";
import {
	type HoldReason,
	initialLaunch,
	type LaunchState,
	launchStep,
	LAUNCH_TIMING as T,
} from "./launch-model";

/** A launch store as the app's, without the native-appearance import. */
const makeStore = () => create<LaunchState>()(() => initialLaunch("dark"));
type Store = ReturnType<typeof makeStore>;

const hold = (store: Store, reason: HoldReason) =>
	store.setState((s) => launchStep(s, { reason, type: "hold" }));
const release = (store: Store, reason: HoldReason) =>
	store.setState((s) => launchStep(s, { reason, type: "release" }));

/** Runs a clock with every effect recorded, in order. */
function start(store: Store) {
	const calls: string[] = [];
	const effects = {
		hideNativeSplash: vi.fn(() => calls.push("hideNativeSplash")),
		interactive: vi.fn((timedOut: boolean) =>
			calls.push(`interactive:${timedOut}`)
		),
		leave: vi.fn(() => {
			calls.push("leave");
			store.setState((s) => launchStep(s, { type: "leave" }));
		}),
		releaseNativeAppearance: vi.fn(() => calls.push("releaseNativeAppearance")),
		timedOut: vi.fn((holds: readonly HoldReason[]) =>
			calls.push(`timedOut:${holds.join(",")}`)
		),
	};
	const stop = runCoverClock(store, effects);
	return { calls, effects, stop };
}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("the cover's clock", () => {
	it("leaves after the settle when nothing holds it, and is interactive then", () => {
		const store = makeStore();
		const { calls, effects } = start(store);
		vi.advanceTimersByTime(T.settleMs - 1);
		expect(effects.leave).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(calls).toEqual([
			"hideNativeSplash",
			"releaseNativeAppearance",
			"leave",
			"interactive:false",
		]);
	});

	it("stays while held, and leaves once the last hold clears", () => {
		const store = makeStore();
		hold(store, "fonts");
		hold(store, "gate");
		const { effects } = start(store);
		release(store, "fonts");
		vi.advanceTimersByTime(T.settleMs * 3);
		expect(effects.leave).not.toHaveBeenCalled();
		release(store, "gate");
		vi.advanceTimersByTime(T.settleMs);
		expect(effects.leave).toHaveBeenCalledOnce();
		expect(effects.interactive).toHaveBeenCalledExactlyOnceWith(false);
		expect(effects.timedOut).not.toHaveBeenCalled();
	});

	it("stays when a hold comes back during the settle", () => {
		const store = makeStore();
		const { effects } = start(store);
		vi.advanceTimersByTime(T.settleMs - 10);
		hold(store, "bootstrap");
		vi.advanceTimersByTime(T.settleMs * 2);
		expect(effects.leave).not.toHaveBeenCalled();
		release(store, "bootstrap");
		vi.advanceTimersByTime(T.settleMs);
		expect(effects.leave).toHaveBeenCalledOnce();
	});

	it("never lets go across a same-commit hand-off (fonts released, gate held)", () => {
		const store = makeStore();
		hold(store, "fonts");
		const { effects } = start(store);
		// One commit: the fonts hold's cleanup, then the gate's hold.
		release(store, "fonts");
		hold(store, "gate");
		vi.advanceTimersByTime(T.settleMs * 3);
		expect(effects.leave).not.toHaveBeenCalled();
		expect(store.getState().holds).toEqual(["gate"]);
	});

	it("leaves at maxCoverMs with holds up, reports them, and is interactive only when they clear", () => {
		const store = makeStore();
		hold(store, "gate");
		const { calls, effects } = start(store);
		vi.advanceTimersByTime(T.maxCoverMs + T.settleMs);
		expect(calls).toEqual([
			"hideNativeSplash",
			"timedOut:gate",
			"hideNativeSplash",
			"releaseNativeAppearance",
			"leave",
		]);
		expect(effects.interactive).not.toHaveBeenCalled();
		release(store, "gate");
		expect(effects.interactive).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("fires interactive once per cover, whatever happens after", () => {
		const store = makeStore();
		const { effects } = start(store);
		vi.advanceTimersByTime(T.settleMs);
		hold(store, "gate");
		release(store, "gate");
		vi.advanceTimersByTime(T.maxCoverMs);
		expect(effects.interactive).toHaveBeenCalledOnce();
		expect(effects.leave).toHaveBeenCalledOnce();
	});

	it("releases native appearance before the store hears the cover leave", () => {
		const store = makeStore();
		const { calls } = start(store);
		vi.advanceTimersByTime(T.settleMs);
		expect(calls.indexOf("releaseNativeAppearance")).toBeLessThan(
			calls.indexOf("leave")
		);
	});

	it("hides the native splash by itself if the art never reports in", () => {
		const store = makeStore();
		hold(store, "gate");
		const { effects } = start(store);
		vi.advanceTimersByTime(T.nativeHideFallbackMs);
		expect(effects.hideNativeSplash).toHaveBeenCalledOnce();
		expect(effects.leave).not.toHaveBeenCalled();
	});

	it("does nothing once stopped, or when the cover isn't up", () => {
		const store = makeStore();
		const { effects, stop } = start(store);
		stop();
		vi.advanceTimersByTime(T.maxCoverMs * 2);
		expect(effects.leave).not.toHaveBeenCalled();
		const after = start(store);
		vi.advanceTimersByTime(T.settleMs);
		const left = makeStore();
		left.setState({ phase: "gone" });
		const none = start(left);
		vi.advanceTimersByTime(T.maxCoverMs * 2);
		expect(after.effects.leave).toHaveBeenCalledOnce();
		expect(
			Object.values(none.effects).some((f) => f.mock.calls.length > 0)
		).toBe(false);
	});
});

describe("a LaunchHold after launch", () => {
	it("draws nothing under the cover", () => {
		expect(holdShows(false, false)).toBe("nothing");
		expect(holdShows(false, true)).toBe("nothing");
	});

	it("shows only the background for quietSpinnerAfterMs, then the spinner", () => {
		let due = false;
		waitForQuietSpinner(() => {
			due = true;
		});
		vi.advanceTimersByTime(T.quietSpinnerAfterMs - 1);
		expect(holdShows(true, due)).toBe("background");
		vi.advanceTimersByTime(1);
		expect(holdShows(true, due)).toBe("spinner");
	});

	it("never shows the spinner for a load that ends first", () => {
		let due = false;
		const cancel = waitForQuietSpinner(() => {
			due = true;
		});
		vi.advanceTimersByTime(T.quietSpinnerAfterMs / 2);
		cancel();
		vi.advanceTimersByTime(T.quietSpinnerAfterMs);
		expect(due).toBe(false);
	});
});
