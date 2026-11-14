import * as Localization from "expo-localization";

/**
 * What linking Telegram turns on, shown before the link is made. Its wording
 * is the `telegram_outreach` consent: change it and bump the version below.
 */
export const LINK_DISCLOSURE = [
	"Check-ins arrive as a Telegram message you can answer with a tap or by writing back.",
	"Linking turns on check-ins.",
	"Telegram shows previews on your lock screen, so the first line of every message stays general.",
	"Chat messages from people stay on notifications.",
] as const;

/** Sent with `createLink`, recorded with the consent. */
export const TELEGRAM_OUTREACH_CONSENT_VERSION = "1.0";

/** How long a minted link works (`LINK_TOKEN_TTL_MS` on the backend). */
export const LINK_LIFETIME_MINUTES = 15;

/** The device's region (ISO 3166-1 alpha-2), for the crisis resources the bot names. */
export function deviceRegion(): string | undefined {
	return Localization.getLocales()[0]?.regionCode ?? undefined;
}
