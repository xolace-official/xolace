import { fitSheet, PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

const TRANSCRIPT_DETENT = 0.7;

export const lanternScreens: readonly RootScreen[] = [
	{
		name: "lantern-welcome",
		options: { ...PLAYER_OPTIONS, gestureEnabled: false },
	},
	{
		name: "library/[slug]",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "default",
		}),
	},
	{
		name: "reader-appearance",
		options: (context) => ({
			...fitSheet(context),
			sheetLargestUndimmedDetentIndex: "last",
		}),
	},
	{ name: "reader-sources", options: fitSheet },
	{
		name: "reader-transcript",
		options: (context) => ({
			...fitSheet(context),
			sheetAllowedDetents: [TRANSCRIPT_DETENT],
		}),
	},
];
