import { useLayoutEffect } from "react";
import { create } from "zustand";
import { LAUNCH_PHONE_SCHEME } from "@/lib/native-appearance";
import {
	type HoldReason,
	initialLaunch,
	isRevealed,
	type LaunchScheme,
	type LaunchState,
	launchStep,
} from "./launch-model";

type Actions = {
	hold: (reason: HoldReason) => () => void;
	leave: () => void;
	done: () => void;
	replay: (scheme: LaunchScheme) => void;
};

/**
 * Set once the cover has left, on the JS global so it outlives this module: a dev fast refresh of
 * this file makes a new store, which must not put the cover back up over the running app. A reload
 * starts a new JS context, and the cover with it.
 */
const launchGlobal = globalThis as { __xolaceLaunchLeft?: boolean };

export const useLaunch = create<LaunchState & Actions>()((set) => ({
	...initialLaunch(LAUNCH_PHONE_SCHEME),
	...(launchGlobal.__xolaceLaunchLeft ? { phase: "gone" as const } : {}),
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
	leave: () => {
		launchGlobal.__xolaceLaunchLeft = true;
		set((s) => launchStep(s, { type: "leave" }));
	},
	replay: (scheme) => set((s) => launchStep(s, { scheme, type: "replay" })),
}));

export function useLaunchHold(active: boolean, reason: HoldReason): void {
	useLayoutEffect(() => {
		if (!active) {
			return;
		}
		return useLaunch.getState().hold(reason);
	}, [active, reason]);
}

export function useLaunchRevealed(): boolean {
	return useLaunch((s) => isRevealed(s.phase));
}
