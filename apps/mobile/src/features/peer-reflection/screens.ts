import { fitSheet, NO_GESTURE, type RootScreen } from "@/lib/root-screen";

/** No swipe back out of a reflection's path (Done is the way out); reporting is a sheet sized to fit. */
export const peerReflectionScreens: readonly RootScreen[] = [
	{ name: "peer-reflections", options: NO_GESTURE },
	{ name: "report-reflection", options: fitSheet },
];
