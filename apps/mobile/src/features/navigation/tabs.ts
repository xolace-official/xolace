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
};

/**
 * The tabs, in order: Today · Explore · Connect · You. Until its screen PR, a tab
 * hosts the old screen that did its job (Today: Discovery, Explore: the Browse
 * hub, You: Profile); a screen PR swaps the tab's route shim and edits only its
 * own entry here.
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
 * Paths that moved, and where they live now. Shipped builds, notification
 * payloads and outside links still open the old ones; each has a route under
 * `(protected)` that sends it on (`MovedRoute`). A path matches with everything
 * under it, which moves along: `/browse/topic/sleep` is `/explore/topic/sleep`.
 */
const MOVED: Readonly<Record<string, string>> = {
	browse: "/explore",
	discovery: "/today",
	profile: "/you",
};

/** Paths under a moved one that stayed where they were (not tabs yet). */
const STAYED: readonly string[] = ["/profile/insights"];

/** Where a moved path lives now, or null if it didn't move. */
export function movedPath(pathname: string): string | null {
	const [, root = "", ...rest] = pathname.split("/");
	if (!Object.hasOwn(MOVED, root) || STAYED.includes(pathname)) {
		return null;
	}
	return [MOVED[root], ...rest].filter(Boolean).join("/");
}

/** The old roots that moved, for the route checks. */
export const movedRoots = (): string[] => Object.keys(MOVED);
