import { fitSheet, type RootScreen } from "@/lib/root-screen";

const REDUCED_FADE_MS = 200;

export const ratingsScreens: readonly RootScreen[] = [
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
	{ name: "ratings/tell-us", options: fitSheet },
];
