import { fitSheet, NO_GESTURE, type RootScreen } from "@/lib/root-screen";

/** No swipe back to the path the session ended on; the follow-up is a sheet sized to fit. */
export const sessionEndScreens: readonly RootScreen[] = [
	{ name: "session-end", options: NO_GESTURE },
	{ name: "session-follow-up", options: fitSheet },
];
