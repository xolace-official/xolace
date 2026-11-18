import { router } from "expo-router";

/**
 * Where the app lands: Today's tab. "/" (sign-in, intake, old links and notification
 * payloads) hands over to it at once, and going home is `goHome()`.
 */
export const LANDING = "/today" as const;

/**
 * Back to Today from anywhere. From a screen pushed over the tabs, `dismissTo` pops back to
 * them. With the tabs on top (Explore, Connect, You), expo-router resolves `dismissTo` inside
 * the tab navigator, which has no POP_TO, so it does nothing there; the `navigate` after it
 * switches tab. Each is resolved against the state the one before left, so after a real pop
 * the `navigate` lands on the Today already focused and does nothing.
 */
export function goHome() {
	router.dismissTo(LANDING);
	router.navigate(LANDING);
}
