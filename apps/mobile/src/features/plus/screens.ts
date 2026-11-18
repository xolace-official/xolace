import type { RootScreen } from "@/lib/root-screen";

/** The paywall draws its own top (the chip and Restore over Flux's postcard), so no header. */
const PLUS_OPTIONS = {
	gestureEnabled: true,
	headerShown: false,
	presentation: "fullScreenModal",
} as const;

export const plusScreens: readonly RootScreen[] = [
	// Not its own root group: a sibling of (protected) competes for `/` and
	// expo-router 58+ picks it first. The path stays `/upgrade` for every caller.
	{ name: "upgrade", options: PLUS_OPTIONS },
];
