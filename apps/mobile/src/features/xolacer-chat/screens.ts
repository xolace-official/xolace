import type { RootScreen } from "@/lib/root-screen";

/** Skipping a rating should feel like dismissing, not navigating away. */
const RATE_OPTIONS = {
	presentation: "formSheet",
	sheetGrabberVisible: true,
} as const;

/** Like the rating sheet, but full height so every field is reachable without a drag. */
const EDIT_PROFILE_OPTIONS = {
	headerShown: true,
	presentation: "formSheet" as const,
	sheetAllowedDetents: [1],
	sheetCornerRadius: 28,
};

export const xolacerChatScreens: readonly RootScreen[] = [
	{ name: "xolacer-setup" },
	{ name: "xolacer-edit", options: EDIT_PROFILE_OPTIONS },
	{ name: "rate/[conversationId]", options: RATE_OPTIONS },
];
