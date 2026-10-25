import type { PaywallSurface } from "@/src/features/purchases/use-paywall";

/** Feature row ids rendered by paywall-feature-section.tsx. */
export type PaywallFeatureId =
	| "insights"
	| "themes"
	| "avatars"
	| "timeline"
	| "mirror_tone"
	| "quotes"
	| "caps"
	| "audio";

/**
 * Which feature row to visually highlight, keyed by the surface that opened
 * the paywall. `null` surfaces are generic entry points (settings, profile)
 * with no single matching feature.
 */
export const PAYWALL_SURFACE_FEATURE: Record<
	PaywallSurface,
	PaywallFeatureId | null
> = {
	// Bridge has no feature row of its own — its cap lives under "Higher daily
	// limits" alongside reflections and vents.
	bridge_draft: "caps",
	browse: "audio",
	compounding_upsell: "insights",
	daily_quote: "quotes",
	// No feature row for dictation; the surface line below carries it.
	dictation: null,
	insight_teaser: "insights",
	// Intake sells all four offers on its own card deck first; by the time the
	// feature list renders there is no single row to single out.
	intake: null,
	// Kindling binds to curated audio/music twigs (docs/paths-v1.md §0).
	kindling: "audio",
	library_audio: "audio",
	mirror_landed: "insights",
	mirror_tone: "mirror_tone",
	// Voice picker reuses the existing "Mirror voice & tone" row — that row's
	// copy already covers voice, so no separate feature row is added.
	mirror_voice: "mirror_tone",
	premium_avatar: "avatars",
	premium_theme: "themes",
	profile_insight: "insights",
	profile_row: null,
	rate_limit: "caps",
	// Every proactive moment sells the same capability — the thing that keeps
	// coming back, shown early — so they all highlight the insights row.
	session_close: "insights",
	settings_row: null,
	steadiness_numbers: "insights",
	// No feature row for talks yet; the surface line below carries it.
	talk_door: null,
	timeline_extended: "timeline",
	week_intensity: "insights",
};

/** A surface's own line under the Xolace+ title, replacing the default (#513). */
export const PAYWALL_SURFACE_LINE: Partial<Record<PaywallSurface, string>> = {
	// Sells seeing the pattern, never relief (#496 §4).
	compounding_upsell:
		"Xolace+ shows you the pattern: how far it's moved from your usual, and since when.",
	dictation:
		"Xolace+ writes down what you say more sharply, then leaves it for you to edit.",
	steadiness_numbers:
		"Your steadiness is already counted. Xolace+ shows you the numbers.",
	// {name} is the companion's name (#601), filled in by the paywall screen.
	talk_door:
		"Xolace+ lets you talk it through out loud with {name}. When you finish, the whole talk becomes your mirror.",
};
