import { fitSheet, NO_GESTURE, type RootScreen } from "@/lib/root-screen";

export const sessionEndScreens: readonly RootScreen[] = [
	{ name: "session-end", options: NO_GESTURE },
	{ name: "session-follow-up", options: fitSheet },
];
