import { fitSheet, type RootScreen } from "@/lib/root-screen";

/** Talk and its two short sheets, form sheets over it: the samples and orbs stop under them. */
export const talkScreens: readonly RootScreen[] = [
	{ name: "talk-style", options: fitSheet },
	{ name: "talk-kept", options: fitSheet },
];
