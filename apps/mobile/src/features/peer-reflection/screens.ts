import { fitSheet, NO_GESTURE, type RootScreen } from "@/lib/root-screen";

export const peerReflectionScreens: readonly RootScreen[] = [
	{ name: "peer-reflections", options: NO_GESTURE },
	{ name: "report-reflection", options: fitSheet },
];
