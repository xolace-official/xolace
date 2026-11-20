import type { NativeTabsTriggerIconProps } from "expo-router/native-tabs";

export type TabSpec = {
	readonly name: string;
	readonly label: string;
	readonly icon: NativeTabsTriggerIconProps;
	readonly badge?: "unread";
	readonly ownInsets?: boolean;
	readonly avatar?: true;
};

export const TABS: readonly TabSpec[] = [
	{
		icon: {
			md: "wb_twilight",
			sf: { default: "sun.horizon", selected: "sun.horizon.fill" },
		},
		label: "Today",
		name: "today",
	},
	{
		icon: { md: "explore", sf: { default: "safari", selected: "safari.fill" } },
		label: "Explore",
		name: "explore",
		// A topic's cover runs under the bar (`contentInsetAdjustmentBehavior="never"`); every
		// other Explore screen sets "automatic" itself. iOS only: on Android the flag also drops
		// the tab bar's bottom inset, and the topic's cover sits below an opaque bar there.
		ownInsets: process.env.EXPO_OS === "ios",
	},
	{
		badge: "unread",
		icon: {
			md: "forum",
			sf: {
				default: "bubble.left.and.bubble.right",
				selected: "bubble.left.and.bubble.right.fill",
			},
		},
		label: "Connect",
		name: "connect",
	},
	{
		avatar: true,
		icon: {
			md: "account_circle",
			sf: {
				default: "person.crop.circle",
				selected: "person.crop.circle.fill",
			},
		},
		label: "You",
		name: "you",
	},
];
