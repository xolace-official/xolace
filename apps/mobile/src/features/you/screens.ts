import { DETACHED_SHEET, type RootScreen } from "@/lib/root-screen";

export const youScreens: readonly RootScreen[] = [
	// The avatar picker floats over You (a DetachedSheet), so the tab stays put behind it.
	{ name: "avatar", options: DETACHED_SHEET },
];
