import { appLinkRedirect, siteLink } from "../appLinks";

/**
 * Links from an email into the app (#915), through the site's redirect
 * (`../appLinks`): mail clients won't open `xolace://` themselves. Every
 * target carries `from=email`, so the app can count returns from email.
 * Only the targets below exist.
 */

export const EMAIL_LINK_PATH_PREFIX = "/email/open/";

const TARGETS = {
	/** Explore: sounds and short reads. */
	explore: "explore?from=email",
	/** The crisis resources screen. */
	support: "crisis-resources?from=email",
	/** Talk something through. */
	talk: "talk?from=email",
	/** Voice vent: say it out loud and let it go. */
	vent: "voice-vent?from=email",
} as const;

export type EmailLinkTarget = keyof typeof TARGETS;

/** The https URL a link in an email opens for `target`. */
export function emailLink(target: EmailLinkTarget): string {
	return siteLink(EMAIL_LINK_PATH_PREFIX, target);
}

export const openAppFromEmail = appLinkRedirect(
	EMAIL_LINK_PATH_PREFIX,
	TARGETS
);
