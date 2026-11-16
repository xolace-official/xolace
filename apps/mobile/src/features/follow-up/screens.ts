import { PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

export const followUpScreens: readonly RootScreen[] = [
	// The close button (or Android back) is the no-guilt dismiss.
	{ name: "follow-up", options: PLAYER_OPTIONS },
];
