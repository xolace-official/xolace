import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { router } from "expo-router";
import { create } from "zustand";

/** Which locked surface opened the paywall; carried into the paywall_opened / purchase_* events. */
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
	// The hourly reflection/mirror cap. See reflect ErrorState.
	| "rate_limit"
	// The three proactive moments (#220 §5), distinct from the reactive surfaces above.
	| "session_close"
	| "mirror_landed"
	| "profile_insight"
	// Post-signup intake, session 0 (#266); `(intake)/plans` reuses this surface.
	| "intake"
	// A free user's tap on a Browse track row (#340, §9.4). The slug rides on browse_paywall_*.
	| "browse"
	// Session-end's free-user upsell line (docs/paths-v1.md §12, #337). A fixed slot,
	// not one of the five ranked moments: no cooldown, shown every qualifying session.
	| "kindling"
	// The Lantern reader's audio dock at the end of the 30s preview (#411).
	| "library_audio"
	// The insights screen's free-only "Unlock numbers" pill (#517, copy #513).
	| "steadiness_numbers"
	// A free user's compounding upsell (#524): Insights and session end.
	| "compounding_upsell"
	// A free user's first mic tap after Plus dictation shipped (#559). Once per device.
	| "dictation"
	// A free person's tap on Reflect home's talk door (#594).
	| "talk_door";

/** `sessionId` rides only with the `kindling` surface (`paths.requestKindling`). */
type PaywallState = {
	open: (
		surface: PaywallSurface,
		params?: { sessionId?: Id<"sessions"> }
	) => void;
	close: () => void;
};

// Opens/closes the paywall route; analytics are captured in the screen. `close` cannot
// assume a back stack (deep link `xolace:///upgrade` cold-starts on it). The route is
// `(protected)/upgrade`, not its own group: expo-router >= 58 picks a sibling group for `/`.
export const usePaywall = create<PaywallState>(() => ({
	close: () =>
		router.canGoBack() ? router.back() : router.replace("/(protected)"),
	open: (surface, params) =>
		router.push({ params: { surface, ...params }, pathname: "/upgrade" }),
}));
