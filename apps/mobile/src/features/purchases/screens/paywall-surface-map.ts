import type { PaywallSurface } from "@/features/purchases/use-paywall";

export type PaywallFeatureId =
	| "insights"
	| "themes"
	| "avatars"
	| "timeline"
	| "mirror_tone"
	| "quotes"
	| "caps"
	| "audio";

export const PAYWALL_SURFACE_FEATURE: Record<
	PaywallSurface,
	PaywallFeatureId | null
> = {
	bridge_draft: "caps",
	browse: "audio",
	compounding_upsell: "insights",
	daily_quote: "quotes",
	dictation: null,
	insight_teaser: "insights",
	intake: null,
	intake_same_week: null,
	kindling: "audio",
	library_audio: "audio",
	mirror_landed: "insights",
	mirror_tone: "mirror_tone",
	mirror_voice: "mirror_tone",
	premium_avatar: "avatars",
	premium_theme: "themes",
	profile_insight: "insights",
	profile_row: null,
	rate_limit: "caps",
	reach_telegram: null,
	session_close: "insights",
	settings_row: null,
	steadiness_numbers: "insights",
	talk_door: null,
	telegram_cap: "caps",
	timeline_extended: "timeline",
	week_intensity: "insights",
};

export const PAYWALL_SURFACE_LINE: Partial<Record<PaywallSurface, string>> = {
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
};
