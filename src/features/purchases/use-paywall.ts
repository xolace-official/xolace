import { router } from "expo-router";
import { create } from "zustand";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Which locked surface opened the paywall — carried into the
 * paywall_opened / purchase_* PostHog events for funnel attribution.
 */
export type PaywallSurface =
  | "insight_teaser"
  | "week_intensity"
  | "settings_row"
  | "profile_row"
  | "premium_theme"
  | "premium_avatar"
  | "timeline_extended"
  | "mirror_tone"
  | "mirror_voice"
  | "daily_quote"
  | "bridge_draft"
  // Hitting the hourly reflection/mirror cap — the one moment the free ceiling
  // is unmissable. See reflect ErrorState.
  | "rate_limit"
  // The three proactive moments (#220 §5). Distinct from the reactive surfaces
  // above so the funnel can tell an offer the app made from a door the user
  // opened; the `moment` id rides on the card's own events.
  | "session_close"
  | "mirror_landed"
  | "profile_insight"
  // Post-signup intake, session 0 (#266). Its own offer screen fires
  // paywall_opened; the plans step under `(intake)/plans` reuses this surface.
  | "intake"
  // A free user's tap on a Browse track row (#340, §9.4) — the tap opens the
  // paywall instead of the player. The track's slug rides on the
  // browse_paywall_* events, not here.
  | "browse"
  // Session-end's free-user upsell line (docs/paths-v1.md §12, #337). Fixed
  // contract slot, not one of the five ranked proactive moments — no cooldown,
  // shown every qualifying session.
  | "kindling"
  // The Lantern reader's audio dock at the end of the 30s preview (#411).
  // Pushed over the reader, never replacing it — the read stays in place.
  | "library_audio"
  // The insights screen's free-only "Unlock numbers" pill (#517, copy #513).
  | "steadiness_numbers"
  // A free user's compounding upsell (#524): Insights and session end.
  | "compounding_upsell";

/**
 * `sessionId` rides only with the `kindling` surface: the just-completed
 * session a purchase should fulfil kindling for (`paths.requestKindling`).
 */
type PaywallState = {
  open: (surface: PaywallSurface, params?: { sessionId?: Id<"sessions"> }) => void;
  close: () => void;
};

/**
 * Opens/closes the paywall route. Analytics (paywall_opened / paywall_dismissed)
 * are captured inside the paywall screen, which has PostHog + session
 * context in scope. Uses the imperative `router` singleton since this is a
 * Zustand action, not a component.
 *
 * `close` cannot assume a back stack: the route is reachable by deep link
 * (`xolace:///(paywall)`), and on a cold start from one the paywall is the root
 * entry — a bare `router.back()` no-ops there and strands the user in a
 * full-screen modal with no way out. Fall back to the reflect screen.
 *
 * The fallback must name `/(protected)` explicitly. `(onboarding)/index`,
 * `(paywall)/index` and `(protected)/index` all resolve to `/`, so a bare
 * `replace("/")` resolves within the *current* group and lands back on the
 * paywall.
 */
export const usePaywall = create<PaywallState>(() => ({
  open: (surface, params) =>
    router.push({ pathname: "/(paywall)", params: { surface, ...params } }),
  close: () => (router.canGoBack() ? router.back() : router.replace("/(protected)")),
}));
