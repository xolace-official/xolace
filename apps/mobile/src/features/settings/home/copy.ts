import type { IconName } from "@/components/shared/icon";

/** Settings, the main screen (P/design/handoff/settings.md §1), word for word. */
export const HOME_COPY = {
	brand: "Xolace",
	checking: "Checking…",
	couldNotCheck: "Couldn't check",
	downloading: "Downloading…",
	off: "Off",
	offInDev: "Off in dev",
	on: "On",
	personal: "Personal",
	plus: {
		a11yFree:
			"Xolace+. Talk it through out loud, keep the quotes that land, and more themes. See Xolace+.",
		a11yPlus: (left: string | null) =>
			["Xolace+, active.", left && `${left}.`, "Refills Monday."]
				.filter(Boolean)
				.join(" "),
		active: "Active",
		cta: "See Xolace+",
		freeLine:
			"Talk it through out loud, keep the quotes that land, and more themes.",
		left: (minutes: number) => `${minutes} min of talk left this week`,
		leftSpoken: (minutes: number) =>
			`${minutes} ${minutes === 1 ? "minute" : "minutes"} of talk left this week`,
		name: "Xolace+",
		refills: "Refills Monday",
		weekly: "15 min a week",
	},
	preferences: "Preferences",
	reopen: "Reopen to apply",
	rows: {
		account: "Account",
		appearance: "Appearance",
		follow: "Follow & Support",
		mirror: "Mirror",
		notifications: "Notifications",
		privacy: "Privacy & Data",
		updateReady: "Update ready",
		updates: "Check for updates",
	},
	signIn: { apple: "Apple", email: "Email", google: "Google" },
	title: "Settings",
	updateAvailable: "Available",
	upToDate: "Up to date",
	version: (version: string) => `Version ${version}`,
	versionUpdate: (date: string) => `Update ${date}`,
} as const;

/** The rows' icons, with their Android twins. */
export const HOME_ICONS = {
	account: { android: "account_circle", ios: "person.crop.circle" },
	appearance: { android: "contrast", ios: "circle.lefthalf.filled" },
	follow: { android: "favorite", ios: "heart" },
	mirror: { android: "format_quote", ios: "quote.bubble" },
	notifications: { android: "notifications", ios: "bell" },
	plus: { android: "auto_awesome", ios: "sparkles" },
	privacy: { android: "shield_lock", ios: "lock.shield" },
	updates: { android: "replay", ios: "arrow.counterclockwise" },
} as const satisfies Record<string, IconName>;
