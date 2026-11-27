import type { PaywallFeatureId } from "./paywall-surface-map";

type Feature = { id: PaywallFeatureId; title: string; description: string };

export const PAYWALL = {
	close: "Close",
	/** Shown while payments are off and nothing comes from the store. */
	fallback: {
		annual: { detail: "$4.17/mo, billed yearly", price: "$49.99/yr" },
		monthly: { detail: "billed monthly", price: "$9.99/mo" },
	},
	hero: {
		line: "Plus opens up so much more and it goes a long way toward the change you're here to make.",
		title: "Xolace+",
	},
	restore: "Restore",
	restoreLabel: "Restore purchases",
	sections: [
		{
			features: [
				{
					description:
						"The thing that keeps coming back, the third time instead of the thirtieth",
					id: "insights",
					title: "Pattern & language insights",
				},
				{
					description: "Pick how it says things back and it stays that way",
					id: "mirror_tone",
					title: "Mirror voice & tone",
				},
				{
					description:
						"Your own words, handed back and kept, in an archive that's yours",
					id: "quotes",
					title: "Personalized quotes",
				},
				{
					description: "Every guided track and song, unlocked",
					id: "audio",
					title: "Full audio catalog",
				},
			],
			title: "What starts showing up",
		},
		{
			features: [
				{
					description:
						"Five palettes - Noir, Emerald, Velvet, Rosé and Platinum",
					id: "themes",
					title: "Premium themes",
				},
				{
					description: "A face for the fire that isn't the default one",
					id: "avatars",
					title: "Custom avatars",
				},
				{
					description: "Every day, not just the recent ones",
					id: "timeline",
					title: "All your moments",
				},
				{
					description: "More reflections, vents, and message drafts per day",
					id: "caps",
					title: "Higher daily limits",
				},
			],
			title: "Make it yours",
		},
	] satisfies readonly { title: string; features: readonly Feature[] }[],
	unavailable: {
		message:
			"We couldn't reach the App Store. Check your connection and try again.",
		retry: "Try again",
		title: "Plans are temporarily unavailable",
	},
} as const;
