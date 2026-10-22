import type { ComponentProps } from "react";
import { SymbolView } from "expo-symbols";

type SymbolName = ComponentProps<typeof SymbolView>["name"];
export type CrossPlatformSymbol = Exclude<SymbolName, string>;

export const ACCOUNT_ICON: CrossPlatformSymbol = {
  ios: "person.crop.circle",
  android: "account_circle",
  web: "account_circle",
};
export const SPACE_NAME_ICON: CrossPlatformSymbol = {
  ios: "person.text.rectangle",
  android: "badge",
  web: "badge",
};
export const MODE_ICON: CrossPlatformSymbol = {
  ios: "circle.lefthalf.filled",
  android: "contrast",
  web: "contrast",
};
export const APPEARANCE_ICON: CrossPlatformSymbol = {
  ios: "paintbrush.pointed",
  android: "palette",
  web: "palette",
};
export const MOTION_ICON: CrossPlatformSymbol = {
  ios: "figure.walk.motion",
  android: "motion_photos_paused",
  web: "motion_photos_paused",
};
export const REPLAY_ICON: CrossPlatformSymbol = {
  ios: "arrow.counterclockwise",
  android: "replay",
  web: "replay",
};
export const MIRROR_ICON: CrossPlatformSymbol = {
  ios: "quote.bubble",
  android: "format_quote",
  web: "format_quote",
};
export const NOTIFICATIONS_ICON: CrossPlatformSymbol = {
  ios: "bell",
  android: "notifications",
  web: "notifications",
};
export const REACH_ICON: CrossPlatformSymbol = {
  ios: "paperplane",
  android: "send",
  web: "send",
};
export const CHAT_NOTIFICATIONS_ICON: CrossPlatformSymbol = {
  ios: "bubble.left.and.bubble.right",
  android: "forum",
  web: "forum",
};
export const QUIET_HOURS_ICON: CrossPlatformSymbol = {
  ios: "moon.zzz",
  android: "bedtime",
  web: "bedtime",
};
export const SHARE_ICON: CrossPlatformSymbol = {
  ios: "person.2.wave.2",
  android: "groups",
  web: "groups",
};
export const FEEDBACK_ICON: CrossPlatformSymbol = {
  ios: "text.bubble",
  android: "feedback",
  web: "feedback",
};
export const MEMORY_ICON: CrossPlatformSymbol = {
  ios: "brain",
  android: "auto_awesome",
  web: "auto_awesome",
};
export const RETENTION_ICON: CrossPlatformSymbol = {
  ios: "clock.arrow.circlepath",
  android: "history",
  web: "history",
};
export const DELETE_DATA_ICON: CrossPlatformSymbol = {
  ios: "trash",
  android: "delete",
  web: "delete",
};
export const DELETE_ACCOUNT_ICON: CrossPlatformSymbol = {
  ios: "person.crop.circle.badge.xmark",
  android: "person_remove",
  web: "person_remove",
};
export const LOG_OUT_ICON: CrossPlatformSymbol = {
  ios: "rectangle.portrait.and.arrow.right",
  android: "logout",
  web: "logout",
};
export const EMAIL_ICON: CrossPlatformSymbol = {
  ios: "envelope",
  android: "email",
  web: "email",
};
export const SHIELD_ICON: CrossPlatformSymbol = {
  ios: "lock.shield",
  android: "shield",
  web: "shield",
};
export const HEART_ICON: CrossPlatformSymbol = {
  ios: "heart",
  android: "favorite",
  web: "favorite",
};
export const PLUS_TIER_ICON: CrossPlatformSymbol = {
  ios: "sparkles",
  android: "auto_awesome",
  web: "auto_awesome",
};

export const TALK_TIME_ICON: CrossPlatformSymbol = {
  ios: "waveform",
  android: "graphic_eq",
  web: "graphic_eq",
};

export const DISPLAY_NAME_ICON: CrossPlatformSymbol = {
  ios: "textformat",
  android: "text_fields",
  web: "text_fields",
};
