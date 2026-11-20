import type { NativeStackNavigationOptions } from "expo-router";
import {
	fitSheet,
	type RootScreen,
	type ScreenContext,
} from "@/lib/root-screen";

/** The kit's sheet at full height, so every field is reachable without a drag. */
const editProfileOptions = (
	context: ScreenContext
): NativeStackNavigationOptions => ({
	...fitSheet(context),
	headerShown: true,
	sheetAllowedDetents: [1],
});

export const xolacerChatScreens: readonly RootScreen[] = [
	{ name: "xolacer-setup" },
	{ name: "xolacer-edit", options: editProfileOptions },
	// Skipping a rating should feel like dismissing, not navigating away.
	{ name: "rate/[conversationId]", options: fitSheet },
];
