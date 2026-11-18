import type { RootScreen } from "@/lib/root-screen";

/** A chat's header, the thread's and the channel's: who's in the title slot, a minimal back. */
const THREAD_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
} as const;

/** Connect's stack entries outside the tab: a thread, the Xolace channel and a Xolacer's
 * profile. */
export const connectScreens: readonly RootScreen[] = [
	{ name: "chat/[conversationId]", options: THREAD_OPTIONS },
	{ name: "xolace-channel", options: THREAD_OPTIONS },
	{ name: "xolacer/[profileId]" },
];
