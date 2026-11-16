import type { Href } from "expo-router";
import type { NativeTabsTriggerIconProps } from "expo-router/native-tabs";
import type { Shell } from "@/lib/redesign/shell-gate";

/**
 * One tab of the v2 shell. `tab-shell.tsx` draws each as a `NativeTabs.Trigger`;
 * the route it opens is `src/app/(protected)/(tabs)/<name>/`.
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
};

/**
 * The v2 shell, in order: Today · Explore · Connect · You. A screen PR edits
 * only its own entry; a new tab also needs its folder under `(tabs)/` and, in
 * `ELSEWHERE.v1` below, where the old shell sends it.
 */
export const V2_TABS: readonly TabSpec[] = [
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
		// The avatar replaces this with You (S5).
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

/**
 * Tab routes that only one shell shows, and where each lands in the shell that
 * doesn't: old notification taps, deep links and code from either shell keep
 * landing somewhere. NativeTabs never renders a tab without a trigger (it jumps
 * to the first tab instead), so the `(tabs)` layout redirects before it mounts.
 * A route matches with everything under it (`/browse/topic/x` is `browse`).
 */
const ELSEWHERE: Readonly<Record<Shell, Readonly<Record<string, Href>>>> = {
	// Today's place in the old app is the landing route, Reflect.
	v1: { explore: "/browse", today: "/", you: "/profile" },
	v2: { browse: "/explore", discovery: "/today" },
};

/** Where a tab route that `shell` doesn't show should go instead, or null to stay. */
export function tabRedirect(shell: Shell, pathname: string): Href | null {
	const [, root = ""] = pathname.split("/");
	return Object.hasOwn(ELSEWHERE[shell], root) ? ELSEWHERE[shell][root] : null;
}

/** The tab routes each shell sends elsewhere, for the route checks. */
export const redirectedTabs = (shell: Shell): string[] =>
	Object.keys(ELSEWHERE[shell]);
