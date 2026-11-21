import * as Localization from "expo-localization";

export const LINK_DISCLOSURE = [
	"Check-ins arrive as a Telegram message you can answer with a tap or by writing back.",
	"Linking turns on check-ins.",
	"Telegram shows previews on your lock screen, so the first line of every message stays general.",
	"Chat messages from people stay on notifications.",
] as const;

export const TELEGRAM_OUTREACH_CONSENT_VERSION = "1.0";

export function deviceRegion(): string | undefined {
	return Localization.getLocales()[0]?.regionCode ?? undefined;
}
