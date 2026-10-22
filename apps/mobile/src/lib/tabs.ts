/**
 * Tab configuration for the native tab bar.
 *
 * Each tab maps to a route file in src/app/ by `name`.
 * Icons use SF Symbols (`sf`/`selected`) on iOS and Material symbols (`md`) on Android.
 *
 * To customize tabs for your app:
 * - Add/remove entries here and create the matching route file in src/app/
 * - Find SF Symbol names at https://developer.apple.com/sf-symbols/
 * - Find Material icon names at https://fonts.google.com/icons
 */
export const TABS = [
	{
		icon: {
			md: "home",
			selected: "house.fill",
			sf: "house",
		},
		label: "Home",
		name: "index",
	},
	{
		icon: {
			md: "explore",
			selected: "safari.fill",
			sf: "safari",
		},
		label: "Explore",
		name: "explore",
	},
	{
		icon: {
			md: "circle",
			selected: "circle.fill",
			sf: "circle",
		},
		label: "Theme",
		name: "theme",
	},
] as const;
