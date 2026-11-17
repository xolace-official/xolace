import { PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

export const lanternScreens: readonly RootScreen[] = [
	// The first-visit welcome: full screen, and the hold is the only way on (no
	// swipe-dismiss; Android back is swallowed in the screen).
	{
		name: "lantern-welcome",
		options: { ...PLAYER_OPTIONS, gestureEnabled: false },
	},
];
