import { PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

export const intakeScreens: readonly RootScreen[] = [
	// Dev only: intake v2's Xolace+ step on sample plans (#713).
	{ name: "intake-plus-preview", options: PLAYER_OPTIONS },
];
