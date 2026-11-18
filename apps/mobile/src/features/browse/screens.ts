import { PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

export const browseScreens: readonly RootScreen[] = [
	// Hold-to-continue is the only way out: no swipe-dismiss here, Android back
	// swallowed in the route.
	{
		name: "browse-intro",
		options: { ...PLAYER_OPTIONS, gestureEnabled: false },
	},
];
