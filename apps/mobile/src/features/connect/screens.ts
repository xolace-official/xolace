import type { NativeStackNavigationOptions } from "expo-router";
import {
	fitSheet,
	type RootScreen,
	type ScreenContext,
} from "@/lib/root-screen";

const THREAD_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
} as const;

const editOptions = (context: ScreenContext): NativeStackNavigationOptions => ({
	...fitSheet(context),
	headerShown: true,
	sheetAllowedDetents: [1],
});

export const connectScreens: readonly RootScreen[] = [
	{ name: "chat/[conversationId]", options: THREAD_OPTIONS },
	{ name: "xolace-channel", options: THREAD_OPTIONS },
	{ name: "xolacer/[profileId]" },
	{ name: "xolacer-setup" },
	{ name: "xolacer-edit", options: editOptions },
	{ name: "age-gate", options: fitSheet },
	{ name: "rate/[conversationId]", options: fitSheet },
];
