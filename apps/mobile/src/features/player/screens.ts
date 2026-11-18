import type { RootScreen } from "@/lib/root-screen";

/**
 * Full screen from the bottom, outside the tabs, as production's player. A transparent modal
 * rather than `fullScreenModal`, so swipe down (`use-swipe-close.ts`) shows what's under the
 * player as it follows the finger. Under Reduce Motion it fades in and out instead.
 */
export const playerScreens: readonly RootScreen[] = [
	{
		name: "player",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "slide_from_bottom",
			presentation: "transparentModal",
		}),
	},
];
