import type { RootScreen } from "@/lib/root-screen";

export const playerScreens: readonly RootScreen[] = [
	{
		name: "player",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "slide_from_bottom",
			presentation: "transparentModal",
		}),
	},
];
