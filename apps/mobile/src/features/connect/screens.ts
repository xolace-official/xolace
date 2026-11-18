import type { RootScreen } from "@/lib/root-screen";

/** The thread's header: the counterpart in the title slot, help and the menu on the right. */
const THREAD_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
} as const;

/** Connect's stack entries outside the tab: a thread and a Xolacer's profile. */
export const connectScreens: readonly RootScreen[] = [
	{ name: "chat/[conversationId]", options: THREAD_OPTIONS },
	{ name: "xolacer/[profileId]" },
];
