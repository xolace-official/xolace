import { useLayoutEffect } from "react";
import { create } from "zustand";
import { LAUNCH_PHONE_SCHEME } from "@/lib/native-appearance";
import {
	initialLaunch,
	isRevealed,
	type LaunchScheme,
	type LaunchState,
	launchStep,
} from "./launch-model";

/**
 * The launch cover's state (`launch-model.ts` has the rules). The cover is up from the first JS
 * frame until nothing holds it, then leaves once and is gone for the rest of the process. A step
 * that is still loading at launch calls `useLaunchHold(true, …)` instead of drawing a loader.
 */
type Actions = {
	/** Takes a hold; returns its release, which only counts once. */
	hold: (reason: string) => () => void;
	/** The cover starts leaving: the first screen's entrance may play now. */
	leave: () => void;
	done: () => void;
	/** Dev states: put the cover back up as on a cold launch, in this scheme. */
	replay: (scheme: LaunchScheme) => void;
};

export const useLaunch = create<LaunchState & Actions>()((set) => ({
	...initialLaunch(LAUNCH_PHONE_SCHEME),
	done: () => set((s) => launchStep(s, { type: "done" })),
	hold: (reason) => {
		set((s) => launchStep(s, { reason, type: "hold" }));
		let released = false;
		return () => {
			if (released) {
				return;
			}
			released = true;
			set((s) => launchStep(s, { reason, type: "release" }));
		};
	},
	leave: () => set((s) => launchStep(s, { type: "leave" })),
	replay: (scheme) => set((s) => launchStep(s, { scheme, type: "replay" })),
}));

/**
 * Keeps the launch cover up while `active`. A layout effect, so the hold is in before the frame
 * that would otherwise let the cover go. Does nothing once the cover is leaving: after launch a
 * step shows its own loading state (`LaunchHold`).
 */
export function useLaunchHold(active: boolean, reason: string): void {
	useLayoutEffect(() => {
		if (!active) {
			return;
		}
		return useLaunch.getState().hold(reason);
	}, [active, reason]);
}

/** True once the cover has started leaving (or was never there): entrances may play. */
export function useLaunchRevealed(): boolean {
	return useLaunch((s) => isRevealed(s.phase));
}
