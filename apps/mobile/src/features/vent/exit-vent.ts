/**
 * Home, as notification taps go there (`notificationTapPlan` in `src/lib/notification-tap.ts`):
 * Reflect today, Today once its screen PR moves the landing.
 */
const HOME = "/";

type Navigator = {
	canGoBack: () => boolean;
	back: () => void;
	dismissTo: (href: typeof HOME) => void;
};

/**
 * Leaves the vent: back to where it was opened from, or home when it was the first screen (a cold
 * launch from a follow-up notification or a deep link into /voice-vent leaves nothing beneath it).
 * `dismissTo`, not `replace`, so a home already in the stack isn't stacked twice.
 */
export function exitVent(router: Navigator): void {
	if (router.canGoBack()) {
		router.back();
		return;
	}
	router.dismissTo(HOME);
}
