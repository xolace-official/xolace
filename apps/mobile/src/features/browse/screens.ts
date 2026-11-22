import { PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

export const browseScreens: readonly RootScreen[] = [
	{
		name: "browse-intro",
		options: { ...PLAYER_OPTIONS, gestureEnabled: false },
	},
];
