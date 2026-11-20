import { fitSheet, type RootScreen } from "@/lib/root-screen";

/**
 * The pushed screens draw the native header (the stack hides it by default): Letters with its
 * large title, write and the reader with a small one, each with the minimal back button. Their
 * header options come from `useHeaderOptions` in the screen.
 */
const PUSHED = { headerShown: true } as const;

/** Letters (S20): pushed screens, and Report as a sheet sized to fit, like `/report-reflection`. */
export const lettersScreens: readonly RootScreen[] = [
	{ name: "letters/index", options: PUSHED },
	{ name: "letters/write", options: PUSHED },
	{ name: "letters/read/[id]", options: PUSHED },
	{ name: "letters/report", options: fitSheet },
];
