import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { FEATURES, type FeatureId, SURFACE_LINE } from "./copy";

/** Which of Plus's features a surface opened it for; `null` for the generic ways in. */
const SURFACE_FEATURE: Record<PaywallSurface, FeatureId | null> = {
	// Bridge's cap lives under "Higher daily limits".
	bridge_draft: "caps",
	browse: "audio",
	compounding_upsell: "insights",
	daily_quote: "quotes",
	// No feature row for dictation; its surface line carries it.
	dictation: null,
	insight_teaser: "insights",
	intake: null,
	// Sells in place, never through this screen; here only to keep the record whole.
	intake_same_week: null,
	// Kindling binds to curated audio/music twigs (docs/paths-v1.md §0).
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

const hasLine = (
	surface: PaywallSurface
): surface is keyof typeof SURFACE_LINE => surface in SURFACE_LINE;

/** The line under the title for the surface that opened the paywall, with the companion's name. */
export function surfaceLine(
	surface: PaywallSurface | undefined,
	companionName: string
): string | null {
	return surface && hasLine(surface)
		? SURFACE_LINE[surface].replace("{name}", companionName)
		: null;
}

export type FeatureRow = (typeof FEATURES)[number] & { highlighted: boolean };

/** Plus's features, the one the surface opened it for first and marked. */
export function featureRows(surface: PaywallSurface | undefined): FeatureRow[] {
	const lit = surface ? SURFACE_FEATURE[surface] : null;
	const rows = FEATURES.map((f) => ({ ...f, highlighted: f.id === lit }));
	return [
		...rows.filter((r) => r.highlighted),
		...rows.filter((r) => !r.highlighted),
	];
}

/** The text size (the window's `fontScale`) above which the footer stops staying put: iOS's
 * largest standard size is about 1.35 and the accessibility sizes start near 1.65. */
const FLOWING_FOOTER_ABOVE = 1.4;

/** At the accessibility text sizes a fixed footer fills the screen and pushes Continue free off
 * it, so the plans and the button scroll with the page instead, the plans stacked. */
export function footerFlows(fontScale: number): boolean {
	return fontScale > FLOWING_FOOTER_ABOVE;
}
