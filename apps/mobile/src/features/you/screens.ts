import { DETACHED_SHEET, fitSheet, type RootScreen } from "@/lib/root-screen";

export const youScreens: readonly RootScreen[] = [
	{ name: "avatar", options: DETACHED_SHEET },
	{ name: "steadiness-face-info", options: fitSheet },
	{ name: "moments/index" },
	{ name: "moments/session/[id]" },
];
