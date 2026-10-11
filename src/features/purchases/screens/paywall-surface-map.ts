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
export const PAYWALL_SURFACE_FEATURE: Record<PaywallSurface, PaywallFeatureId | null> = {
  insight_teaser: "insights",
  week_intensity: "insights",
  premium_theme: "themes",
  premium_avatar: "avatars",
  timeline_extended: "timeline",
  mirror_tone: "mirror_tone",
  // Voice picker reuses the existing "Mirror voice & tone" row — that row's
  // copy already covers voice, so no separate feature row is added.
  mirror_voice: "mirror_tone",
  daily_quote: "quotes",
  // Bridge has no feature row of its own — its cap lives under "Higher daily
  // limits" alongside reflections and vents.
  bridge_draft: "caps",
  rate_limit: "caps",
  settings_row: null,
  profile_row: null,
  // Intake sells all four offers on its own card deck first; by the time the
  // feature list renders there is no single row to single out.
  intake: null,
  // Every proactive moment sells the same capability — the thing that keeps
  // coming back, shown early — so they all highlight the insights row.
  session_close: "insights",
  mirror_landed: "insights",
  profile_insight: "insights",
  browse: "audio",
  // Kindling binds to curated audio/music twigs (docs/paths-v1.md §0).
  kindling: "audio",
  library_audio: "audio",
  steadiness_numbers: "insights",
  compounding_upsell: "insights",
};

/** A surface's own line under the Xolace+ title, replacing the default (#513). */
export const PAYWALL_SURFACE_LINE: Partial<Record<PaywallSurface, string>> = {
  steadiness_numbers: "Your steadiness is already counted. Xolace+ shows you the numbers.",
  // Sells seeing the pattern, never relief (#496 §4).
  compounding_upsell: "Xolace+ shows you the pattern: how far it's moved from your usual, and since when.",
};
