import { fitSheet, type RootScreen } from "@/lib/root-screen";

const PUSHED = { headerShown: true } as const;

export const lettersScreens: readonly RootScreen[] = [
	{ name: "letters/index", options: PUSHED },
	{ name: "letters/write", options: PUSHED },
	{ name: "letters/read/[id]", options: PUSHED },
	{ name: "letters/report", options: fitSheet },
];
