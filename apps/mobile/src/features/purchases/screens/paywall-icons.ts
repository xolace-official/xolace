import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

type SymbolName = ComponentProps<typeof SymbolView>["name"];
export type CrossPlatformSymbol = Exclude<SymbolName, string>;

export const INSIGHTS_ICON: CrossPlatformSymbol = {
	android: "trending_up",
	ios: "chart.line.uptrend.xyaxis",
	web: "trending_up",
};
export const MIRROR_TONE_ICON: CrossPlatformSymbol = {
	android: "graphic_eq",
	ios: "waveform",
	web: "graphic_eq",
};
export const QUOTES_ICON: CrossPlatformSymbol = {
	android: "format_quote",
	ios: "text.quote",
	web: "format_quote",
};
export const THEMES_ICON: CrossPlatformSymbol = {
	android: "palette",
	ios: "paintpalette.fill",
	web: "palette",
};
export const AVATARS_ICON: CrossPlatformSymbol = {
	android: "account_circle",
	ios: "person.crop.circle.fill",
	web: "account_circle",
};
export const TIMELINE_ICON: CrossPlatformSymbol = {
	android: "history",
	ios: "clock.arrow.circlepath",
	web: "history",
};
export const CAPS_ICON: CrossPlatformSymbol = {
	android: "bolt",
	ios: "bolt.fill",
	web: "bolt",
};
export const AUDIO_ICON: CrossPlatformSymbol = {
	android: "headphones",
	ios: "headphones",
	web: "headphones",
};
