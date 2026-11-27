export type BannerInput = {
	/** The app is in the foreground. */
	active: boolean;
	/** The focused screen shows its own connection message. */
	claimed: boolean;
	/** A natively presented screen (form sheet, modal) is up over the shell. */
	covered: boolean;
	/** A screen reader (VoiceOver, TalkBack) is on, so an announcement is heard. */
	listening: boolean;
	/** The connection model's offline flag. */
	offline: boolean;
};

export type BannerAnnouncement = "offline" | "back_online";

export type BannerState = { announced: boolean };

export type BannerStep = {
	announce: BannerAnnouncement | null;
	state: BannerState;
	visible: boolean;
};

export const bannerStart: BannerState = { announced: false };

/** Offline, and nothing else on screen is already saying so or covering the shell. */
export const bannerVisible = (input: BannerInput): boolean =>
	input.offline && !(input.claimed || input.covered);

/**
 * Screen readers hear "You're offline" the first time the banner shows in an offline spell,
 * and "Back online" when the spell ends, only if they heard the first. Hiding and showing
 * again for a claim or a sheet says nothing. Leaving the app ends the spell silently: back in
 * the foreground the offline flag restarts its grace, and that isn't the internet coming back.
 * Nothing counts as heard while no screen reader is on.
 */
export function nextBanner(state: BannerState, input: BannerInput): BannerStep {
	const visible = bannerVisible(input);
	if (!input.active) {
		return { announce: null, state: bannerStart, visible };
	}
	if (visible && input.listening && !state.announced) {
		return { announce: "offline", state: { announced: true }, visible };
	}
	if (!input.offline && state.announced) {
		return { announce: "back_online", state: { announced: false }, visible };
	}
	return { announce: null, state, visible };
}
