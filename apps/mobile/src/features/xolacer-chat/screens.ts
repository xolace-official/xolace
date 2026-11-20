import { fitSheet, type RootScreen } from "@/lib/root-screen";

export const xolacerChatScreens: readonly RootScreen[] = [
	{ name: "rate/[conversationId]", options: fitSheet },
];
