import { setAudioModeAsync } from "expo-audio";
import type { RefObject } from "react";

/** The one audio-session mode every playback hook applies (#367). `doNotMix` is required for
 * lock-screen controls. */
export const AUDIO_SESSION = {
	interruptionMode: "doNotMix",
	playsInSilentMode: true,
	shouldPlayInBackground: true,
} as const;

/** Who is audible: a per-hook identity (its ref object) and how to silence it. */
type Focus = { owner: RefObject<unknown>; pause: () => void };
let active: Focus | null = null;
// Bumps whenever focus changes hands, so a play queued before an await can
// tell that another source spoke up in the meantime.
let epoch = 0;

export const audioFocusEpoch = () => epoch;
export const holdsAudioFocus = (owner: RefObject<unknown>) =>
	active?.owner === owner;

/** One sound at a time (S4): the claimant pauses whoever held focus. `owner` is the hook's ref
 * object, stable across re-mints. */
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

/** A hook going away drops focus it still holds, so nobody later pauses a released player. No
 * epoch bump. */
export function releaseAudioFocus(owner: RefObject<unknown>) {
	if (active?.owner === owner) {
		active = null;
	}
}

/** Recorders: silence whatever is playing without taking focus themselves. */
export function yieldAudioFocus() {
	try {
		active?.pause();
	} catch {
		// released player, see above
	}
	active = null;
	epoch++;
}

/** Every in-app player calls this right before `play()`. */
export function claimAudioSession(
	owner: RefObject<unknown>,
	pause: () => void
) {
	claimAudioFocus(owner, pause);
	return setAudioModeAsync(AUDIO_SESSION);
}
