import type { RootScreen } from "@/lib/root-screen";

/** Native header kept (transparent, untitled) so the screen's Stack.Toolbar
 * buttons have somewhere to land. */
const PAYWALL_OPTIONS = {
	gestureEnabled: true,
	headerShadowVisible: false,
	headerTransparent: true,
	presentation: "fullScreenModal",
	title: "",
} as const;

export const purchasesScreens: readonly RootScreen[] = [
	// Not its own root group: a sibling of (protected) competes for `/` and
	// expo-router 58+ picks it first.
	{ name: "upgrade", options: PAYWALL_OPTIONS },
];
