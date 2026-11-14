import { httpAction } from "../../_generated/server";

/**
 * Links from Telegram into the app (#768). Telegram's URL buttons take only
 * http(s) and tg:// URLs, and the app has no universal links yet, so a button
 * points at this deployment's site, which redirects to the app's own scheme.
 * Only the targets below exist; anything else is a 404.
 */

export const APP_LINK_PATH_PREFIX = "/telegram/open/";

/** The app's scheme (`apps/mobile/app.config.ts`). */
const APP_SCHEME = "xolace://";

const TARGETS = {
	/** The app, wherever it opens. */
	app: "",
	/** The Xolace+ paywall, from the reply cap's upsell (#771). */
	plus: "upgrade?surface=telegram_cap",
	/** The crisis resources screen. */
	support: "crisis-resources?from=telegram",
} as const;

export type AppLinkTarget = keyof typeof TARGETS;

/** The https URL a Telegram button opens for `target`. */
export function appLink(target: AppLinkTarget): string {
	const siteUrl = process.env.CONVEX_SITE_URL;
	if (!siteUrl) {
		throw new Error("CONVEX_SITE_URL is required for Telegram app links.");
	}
	return `${siteUrl}${APP_LINK_PATH_PREFIX}${target}`;
}

const isTarget = (value: string): value is AppLinkTarget =>
	Object.hasOwn(TARGETS, value);

export const openApp = httpAction(async (_ctx, request) => {
	const target = new URL(request.url).pathname.slice(
		APP_LINK_PATH_PREFIX.length
	);
	if (!isTarget(target)) {
		return new Response("Not found", { status: 404 });
	}
	return new Response(null, {
		headers: { Location: `${APP_SCHEME}${TARGETS[target]}` },
		status: 302,
	});
});
