/**
 * Web fallback for the tab bar. Uses expo-router/ui Tabs instead of NativeTabs.
 * This file is loaded automatically on web via Expo platform extensions (.web.tsx).
 */
import {
	TabList,
	type TabListProps,
	TabSlot,
	Tabs,
	TabTrigger,
	type TabTriggerSlotProps,
} from "expo-router/ui";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import React from "react";
import { Pressable, type PressableProps, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { MaxContentWidth } from "@/src/lib/theme";
import { ExternalLink } from "./external-link";

const TAB_CONTAINER_STYLE = { maxWidth: MaxContentWidth };
const EXTERNAL_ICON_NAME = {
	ios: "arrow.up.right.square",
	web: "link",
} as const;

export default function AppTabs() {
	return (
		<Tabs>
			<TabSlot className="h-full" />
			<TabList asChild>
				<CustomTabList>
					<TabTrigger asChild href="/" name="home">
						<TabButton>Home</TabButton>
					</TabTrigger>
				</CustomTabList>
			</TabList>
		</Tabs>
	);
}

export function TabButton({
	children,
	isFocused,
	...props
}: TabTriggerSlotProps) {
	return (
		// expo-router/ui slot props still type `ref` as the pre-0.87 View class.
		<Pressable {...(props as PressableProps)} className="active:opacity-70">
			<View
				className={`rounded-2xl px-4 py-1 ${
					isFocused ? "bg-default" : "bg-surface"
				}`}
			>
				<AppText
					className={`text-sm ${
						isFocused
							? "font-semibold text-foreground"
							: "font-normal text-muted"
					}`}
				>
					{children}
				</AppText>
			</View>
		</Pressable>
	);
}

export function CustomTabList(props: TabListProps) {
	const accentColor = useThemeColor("accent");

	const iconName = EXTERNAL_ICON_NAME;

	return (
		<View
			{...props}
			className="absolute w-full flex-row items-center justify-center p-4"
		>
			<View
				className="grow flex-row items-center gap-2 rounded-4xl bg-surface px-8 py-2"
				style={TAB_CONTAINER_STYLE}
			>
				<AppText className="mr-auto font-bold text-foreground text-sm">
					Expo Forge
				</AppText>

				{props.children}

				<ExternalLink asChild href="https://docs.expo.dev">
					<Pressable className="ml-4 flex-row items-center justify-center gap-1">
						<AppText className="text-accent text-sm">Docs</AppText>
						<SymbolView name={iconName} size={12} tintColor={accentColor} />
					</Pressable>
				</ExternalLink>
			</View>
		</View>
	);
}
