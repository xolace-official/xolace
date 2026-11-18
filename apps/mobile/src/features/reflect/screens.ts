import type { RootScreen } from "@/lib/root-screen";

/**
 * Reflect, pushed over the tabs from Today. Today's card and pill zoom into it (iOS 18+);
 * without the zoom (Android, older iOS, links from elsewhere) it takes the platform's push,
 * and with Reduce Motion, where the card doesn't zoom, it crossfades in.
 */
export const reflectScreens: readonly RootScreen[] = [
	{
		name: "reflect",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "default",
		}),
	},
];
