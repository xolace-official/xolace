import type { RootScreen } from "@/lib/root-screen";

const PAYWALL_OPTIONS = {
	gestureEnabled: true,
	headerShadowVisible: false,
	headerTransparent: true,
	presentation: "fullScreenModal",
	title: "",
} as const;

export const plusScreens: readonly RootScreen[] = [
	{ name: "upgrade", options: PAYWALL_OPTIONS },
];
