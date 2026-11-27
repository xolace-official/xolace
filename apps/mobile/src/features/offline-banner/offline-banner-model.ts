export type BannerInput = {
	/** The focused screen shows its own connection message. */
	claimed: boolean;
	/** A natively presented screen (form sheet, modal) is up over the shell. */
	covered: boolean;
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
 * again for a claim or a sheet says nothing.
 */
export function nextBanner(state: BannerState, input: BannerInput): BannerStep {
	const visible = bannerVisible(input);
	if (visible && !state.announced) {
		return { announce: "offline", state: { announced: true }, visible };
	}
	if (!input.offline && state.announced) {
		return { announce: "back_online", state: { announced: false }, visible };
	}
	return { announce: null, state, visible };
}
