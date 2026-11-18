import { NO_GESTURE, type RootScreen } from "@/lib/root-screen";

export const careScreens: readonly RootScreen[] = [
	// Get help now: nothing swipes it away by accident.
	{ name: "crisis-resources", options: NO_GESTURE },
	// Trusted Bridge turns its own swipe off on the draft (`bridge-screen.tsx`).
	{ name: "trusted-bridge" },
];
