import { fitSheet, NO_GESTURE, type RootScreen } from "@/lib/root-screen";

export const sitWithThisScreens: readonly RootScreen[] = [
	{ name: "sit-with-this", options: NO_GESTURE },
	{ name: "sit-with-this-swap", options: fitSheet },
];
