import { fitSheet, type RootScreen } from "@/lib/root-screen";

export const xolacerChatScreens: readonly RootScreen[] = [
	// Skipping a rating should feel like dismissing, not navigating away.
	{ name: "rate/[conversationId]", options: fitSheet },
];
