import type { ComponentProps } from "react";
import { SymbolView } from "expo-symbols";

type SymbolName = ComponentProps<typeof SymbolView>["name"];
export type CrossPlatformSymbol = Exclude<SymbolName, string>;

export const INSIGHTS_ICON: CrossPlatformSymbol = {
  ios: "chart.line.uptrend.xyaxis",
  android: "trending_up",
  web: "trending_up",
};
export const MIRROR_TONE_ICON: CrossPlatformSymbol = {
  ios: "waveform",
  android: "graphic_eq",
  web: "graphic_eq",
};
export const QUOTES_ICON: CrossPlatformSymbol = {
  ios: "text.quote",
  android: "format_quote",
  web: "format_quote",
};
export const THEMES_ICON: CrossPlatformSymbol = {
  ios: "paintpalette.fill",
  android: "palette",
  web: "palette",
};
export const AVATARS_ICON: CrossPlatformSymbol = {
  ios: "person.crop.circle.fill",
  android: "account_circle",
  web: "account_circle",
};
export const TIMELINE_ICON: CrossPlatformSymbol = {
  ios: "clock.arrow.circlepath",
  android: "history",
  web: "history",
};
export const CAPS_ICON: CrossPlatformSymbol = {
  ios: "bolt.fill",
  android: "bolt",
  web: "bolt",
};
export const AUDIO_ICON: CrossPlatformSymbol = {
  ios: "headphones",
  android: "headphones",
  web: "headphones",
};
