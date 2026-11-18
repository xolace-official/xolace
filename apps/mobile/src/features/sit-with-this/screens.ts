import { fitSheet, NO_GESTURE, type RootScreen } from "@/lib/root-screen";

/** No swipe back out of an exercise (Close is the way out); the swap is a sheet sized to fit. */
export const sitWithThisScreens: readonly RootScreen[] = [
	{ name: "sit-with-this", options: NO_GESTURE },
	{ name: "sit-with-this-swap", options: fitSheet },
];
