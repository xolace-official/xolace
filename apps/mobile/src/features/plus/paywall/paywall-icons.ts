import type { CrossPlatformSymbol } from "@/lib/cross-platform-symbol";
import type { PaywallFeatureId } from "./paywall-surface-map";

const INSIGHTS_ICON: CrossPlatformSymbol = {
	android: "trending_up",
	ios: "chart.line.uptrend.xyaxis",
	web: "trending_up",
};
const MIRROR_TONE_ICON: CrossPlatformSymbol = {
	android: "graphic_eq",
	ios: "waveform",
	web: "graphic_eq",
};
const QUOTES_ICON: CrossPlatformSymbol = {
	android: "format_quote",
	ios: "text.quote",
	web: "format_quote",
};
const THEMES_ICON: CrossPlatformSymbol = {
	android: "palette",
	ios: "paintpalette.fill",
	web: "palette",
};
const AVATARS_ICON: CrossPlatformSymbol = {
	android: "account_circle",
	ios: "person.crop.circle.fill",
	web: "account_circle",
};
const TIMELINE_ICON: CrossPlatformSymbol = {
	android: "history",
	ios: "clock.arrow.circlepath",
	web: "history",
};
const CAPS_ICON: CrossPlatformSymbol = {
	android: "bolt",
	ios: "bolt.fill",
	web: "bolt",
};
const AUDIO_ICON: CrossPlatformSymbol = {
	android: "headphones",
	ios: "headphones",
	web: "headphones",
};

export const FEATURE_ICON: Record<PaywallFeatureId, CrossPlatformSymbol> = {
	audio: AUDIO_ICON,
	avatars: AVATARS_ICON,
	caps: CAPS_ICON,
	insights: INSIGHTS_ICON,
	mirror_tone: MIRROR_TONE_ICON,
	quotes: QUOTES_ICON,
	themes: THEMES_ICON,
	timeline: TIMELINE_ICON,
};
