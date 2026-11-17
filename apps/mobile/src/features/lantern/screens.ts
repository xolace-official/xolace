import { fitSheet, PLAYER_OPTIONS, type RootScreen } from "@/lib/root-screen";

/** The transcript is a fixed height that scrolls; the other sheets fit their content. */
const TRANSCRIPT_DETENT = 0.7;

export const lanternScreens: readonly RootScreen[] = [
	// The first-visit welcome: full screen, and the hold is the only way on (no
	// swipe-dismiss; Android back is swallowed in the screen).
	{
		name: "lantern-welcome",
		options: { ...PLAYER_OPTIONS, gestureEnabled: false },
	},
	// The reader keeps production's path (shares and old links open it). With
	// Reduce Motion it crossfades in instead of sliding (#400).
	{
		name: "library/[slug]",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "default",
		}),
	},
	// The reader stays bright and touchable behind it, so mode and size changes
	// show on the page live.
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
