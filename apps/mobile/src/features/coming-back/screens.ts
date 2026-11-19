import { DETACHED_SHEET, type RootScreen } from "@/lib/root-screen";

export const comingBackScreens: readonly RootScreen[] = [
	// The greeting floats over Today (a DetachedSheet), so Today stays put behind it.
	{ name: "welcome-back", options: DETACHED_SHEET },
	// The check-in is a page sheet over the greeting; it paints its own paper.
	{
		name: "check-in",
		options: ({ background }) => ({
			contentStyle: { backgroundColor: background },
			headerShown: false,
			presentation: "modal",
		}),
	},
];
