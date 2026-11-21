import { setAudioModeAsync } from "expo-audio";
import type { RefObject } from "react";

/** The one audio-session mode every playback hook applies (#367). `doNotMix` is required for
 * lock-screen controls. */
export const AUDIO_SESSION = {
	interruptionMode: "doNotMix",
	playsInSilentMode: true,
	shouldPlayInBackground: true,
} as const;

type Focus = { owner: RefObject<unknown>; pause: () => void };
let active: Focus | null = null;
let epoch = 0;

export const audioFocusEpoch = () => epoch;
export const holdsAudioFocus = (owner: RefObject<unknown>) =>
	active?.owner === owner;

export function claimAudioFocus(owner: RefObject<unknown>, pause: () => void) {
	if (active?.owner !== owner) {
		epoch++;
	}
	if (active && active.owner !== owner) {
		try {
			active.pause();
		} catch {
			// A released native player makes no sound; nothing to pause.
		}
	}
	active = { owner, pause };
}

export function releaseAudioFocus(owner: RefObject<unknown>) {
	if (active?.owner === owner) {
		active = null;
	}
}

export function yieldAudioFocus() {
	try {
		active?.pause();
	} catch {
		// released player, see above
	}
	active = null;
	epoch++;
}

export function claimAudioSession(
	owner: RefObject<unknown>,
	pause: () => void
) {
	claimAudioFocus(owner, pause);
	return setAudioModeAsync(AUDIO_SESSION);
}

const AMBIENT_SESSION = {
	interruptionMode: "mixWithOthers",
	playsInSilentMode: false,
	shouldPlayInBackground: false,
} as const;

export function claimAmbientSession(
	owner: RefObject<unknown>,
	pause: () => void
) {
	claimAudioFocus(owner, pause);
	return setAudioModeAsync(AMBIENT_SESSION);
}
