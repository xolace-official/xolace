import { DETACHED_SHEET, fitSheet, type RootScreen } from "@/lib/root-screen";

export const youScreens: readonly RootScreen[] = [
	// The avatar picker floats over You (a DetachedSheet), so the tab stays put behind it.
	{ name: "avatar", options: DETACHED_SHEET },
	// Steadiness' ⓘ: reading the face, sized to its rows.
	{ name: "steadiness-face-info", options: fitSheet },
];
