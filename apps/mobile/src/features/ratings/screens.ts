import { fitSheet, type RootScreen } from "@/lib/root-screen";

/** The reduced fade (`REDUCED_FADE_MS` in design/springs, which node can't load). */
const REDUCED_FADE_MS = 200;

export const ratingsScreens: readonly RootScreen[] = [
	// What's New (the app theme) and "Help someone find Xolace" (always the dark ember scene, which
	// paints its own page), fading in over it. No swipe away: Continue and Close.
	{
		name: "ratings/whats-new",
		options: ({ background }) => ({
			contentStyle: { backgroundColor: background },
			headerShown: false,
			presentation: "fullScreenModal",
		}),
	},
	{
		name: "ratings/rate",
		options: ({ reducedMotion }) => ({
			animation: "fade",
			animationDuration: reducedMotion ? REDUCED_FADE_MS : undefined,
			headerShown: false,
			presentation: "fullScreenModal",
			statusBarStyle: "light",
		}),
	},
	// Tell us: a form sheet over the rating screen, in the app theme.
	{ name: "ratings/tell-us", options: fitSheet },
];
