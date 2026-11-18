import type { NativeTabsTriggerIconProps } from "expo-router/native-tabs";

/**
 * One tab. `components/app-tabs.tsx` draws each as a `NativeTabs.Trigger`; the
 * route it opens is `src/app/(protected)/(tabs)/<name>/`.
 */
export type TabSpec = {
	readonly name: string;
	readonly label: string;
	/** SF Symbol on iOS, Material symbol on Android. */
	readonly icon: NativeTabsTriggerIconProps;
	/** A number on the tab: `unread` is Stream's total across every conversation. */
	readonly badge?: "unread";
	/** The tab's screens set their own content insets (a cover that runs under the bar). */
	readonly ownInsets?: boolean;
	/** Drawn with the person's avatar once it loads; `icon` until then (You). */
	readonly avatar?: true;
};

/**
 * The tabs, in order: Today · Explore · Connect · You. Until its screen PR, a tab
 * hosts the old screen that did its job (Explore: the Browse hub); a screen PR swaps
 * the tab's route shim and edits only its own entry here.
 */
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
