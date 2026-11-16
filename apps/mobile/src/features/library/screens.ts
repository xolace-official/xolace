import { fitSheet, type RootScreen } from "@/lib/root-screen";

export const libraryScreens: readonly RootScreen[] = [
	// Reduced motion: the Lantern reader crossfades in instead of sliding (#400).
	{
		name: "library/[slug]",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "default",
		}),
	},
	// The reader stays undimmed behind it, so mode and size changes show on the
	// page live.
	{
		name: "reader-appearance",
		options: (context) => ({
			...fitSheet(context),
			sheetLargestUndimmedDetentIndex: "last",
		}),
	},
];
