import type { RootScreen } from "@/lib/root-screen";

const CHAT_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
} as const;

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
	{ name: "xolace-channel", options: CHAT_OPTIONS },
	{ name: "xolacer-setup" },
	{ name: "xolacer-edit", options: EDIT_PROFILE_OPTIONS },
	{ name: "rate/[conversationId]", options: RATE_OPTIONS },
];
