import type { NativeStackNavigationOptions } from "expo-router";
import {
	fitSheet,
	type RootScreen,
	type ScreenContext,
} from "@/lib/root-screen";

/** A chat's header, the thread's and the channel's: who's in the title slot, a minimal back. */
const THREAD_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
} as const;

/** Edit profile: the kit's sheet at full height, so every field is reachable without a drag. */
const editOptions = (context: ScreenContext): NativeStackNavigationOptions => ({
	...fitSheet(context),
	headerShown: true,
	sheetAllowedDetents: [1],
});

/** Connect's stack entries outside the tab: a thread, the Xolace channel and a Xolacer's
 * profile, a Xolacer's own setup and edit, and the age gate in front of a request. */
export const connectScreens: readonly RootScreen[] = [
	{ name: "chat/[conversationId]", options: THREAD_OPTIONS },
	{ name: "xolace-channel", options: THREAD_OPTIONS },
	{ name: "xolacer/[profileId]" },
	{ name: "xolacer-setup" },
	{ name: "xolacer-edit", options: editOptions },
	// A form sheet, so it opens over whatever asked, native sheets included (Letters).
	{ name: "age-gate", options: fitSheet },
];
