/** Every word on the Xolace+ paywall. */
export const PLUS = {
	chip: "Xolace+",
	compare: {
		example: "Example",
		freeLine:
			"You can tell it's been heavy. Not what's building, or since when.",
		plusLine: "Catch what's compounding.",
		when: "Sunday night · “Why does this keep happening?”",
	},
	free: "Continue free · saying it stays free",
	freeOwned: "Continue",
	includes: "Everything in Plus",
	owned: "Xolace+ is yours",
	plans: { annual: "Yearly", monthly: "Monthly" },
	plansLabel: "Plans",
	privacy: "Privacy Policy",
	restore: "Restore",
	restoreLabel: "Restore purchases",
	sides: { free: "Free", plus: "With Plus" },
	sidesLabel: "Compare the week",
	terms: "Terms of Service",
	title: "Same rough week.\nTwo ways it goes.",
	unavailable: {
		line: "Xolace+ can wait. Everything free is ready.",
		retry: "Try again",
		title: "Plans didn't load.",
	},
} as const;

/** The three example rings on the Plus side: example values, never the reader's own. */
export const RINGS = [
	{
		icon: { android: "work", ios: "briefcase.fill", web: "work" },
		label: "Work · heavier",
		tone: "ember",
		value: 38,
	},
	{
		icon: { android: "bedtime", ios: "bed.double.fill", web: "bedtime" },
		label: "Rest · steady",
		tone: "accent",
		value: 72,
	},
	{
		icon: { android: "favorite", ios: "heart.fill", web: "favorite" },
		label: "Love · easing",
		tone: "accent",
		value: 64,
	},
] as const;

/** What Plus includes, in production's words (the old paywall's rows). */
export const FEATURES = [
	{
		description:
			"The thing that keeps coming back, the third time instead of the thirtieth",
		icon: {
			android: "trending_up",
			ios: "chart.line.uptrend.xyaxis",
			web: "trending_up",
		},
		id: "insights",
		title: "Pattern & language insights",
	},
	{
		description: "Pick how it says things back and it stays that way",
		icon: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" },
		id: "mirror_tone",
		title: "Mirror voice & tone",
	},
	{
		description:
			"Your own words, handed back and kept, in an archive that's yours",
		icon: { android: "format_quote", ios: "text.quote", web: "format_quote" },
		id: "quotes",
		title: "Personalized quotes",
	},
	{
		description: "Every guided track and song, unlocked",
		icon: { android: "headphones", ios: "headphones", web: "headphones" },
		id: "audio",
		title: "Full audio catalog",
	},
	{
		description: "Five palettes - Noir, Emerald, Velvet, Rosé and Platinum",
		icon: { android: "palette", ios: "paintpalette.fill", web: "palette" },
		id: "themes",
		title: "Premium themes",
	},
	{
		description: "A face for the fire that isn't the default one",
		icon: {
			android: "account_circle",
			ios: "person.crop.circle.fill",
			web: "account_circle",
		},
		id: "avatars",
		title: "Custom avatars",
	},
	{
		description: "Every day, not just the recent ones",
		icon: {
			android: "history",
			ios: "clock.arrow.circlepath",
			web: "history",
		},
		id: "timeline",
		title: "All your moments",
	},
	{
		description: "More reflections, vents, and message drafts per day",
		icon: { android: "bolt", ios: "bolt.fill", web: "bolt" },
		id: "caps",
		title: "Higher daily limits",
	},
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

/** A surface's own line under the title (#513). `{name}` is the companion's name (#601). */
export const SURFACE_LINE = {
	// Sells seeing the pattern, never relief (#496 §4).
	compounding_upsell:
		"Xolace+ shows you the pattern: how far it's moved from your usual, and since when.",
	dictation:
		"Xolace+ writes down what you say more sharply, then leaves it for you to edit.",
	reach_telegram:
		"Xolace+ brings your check-ins to Telegram, where you can answer with a tap or write back.",
	steadiness_numbers:
		"Your steadiness is already counted. Xolace+ shows you the numbers.",
	talk_door:
		"Xolace+ lets you talk it through out loud with {name}. When you finish, the whole talk becomes your mirror.",
	telegram_cap:
		"Xolace+ gives you more replies on Telegram each day, so you can keep writing back.",
} as const;
