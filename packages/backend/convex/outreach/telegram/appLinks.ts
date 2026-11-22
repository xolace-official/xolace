import { appLinkRedirect, siteLink } from "../appLinks";

/**
 * Links from Telegram into the app (#768), through the site's redirect
 * (`../appLinks`). Only the targets below exist.
 */

export const APP_LINK_PATH_PREFIX = "/telegram/open/";

const TARGETS = {
	/** The app, wherever it opens. */
	app: "",
	/** The Xolace+ paywall, from the reply cap's upsell (#771). */
	plus: "upgrade?surface=telegram_cap",
	/** Quotes, from the daily quote (B19). */
	quotes: "quotes",
	/** The crisis resources screen. */
	support: "crisis-resources?from=telegram",
} as const;

export type AppLinkTarget = keyof typeof TARGETS;

/** The https URL a Telegram button opens for `target`. */
export function appLink(target: AppLinkTarget): string {
	return siteLink(APP_LINK_PATH_PREFIX, target);
}

export const openApp = appLinkRedirect(APP_LINK_PATH_PREFIX, TARGETS);
