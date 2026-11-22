import type { PublicHttpAction } from "convex/server";
import { httpAction } from "../_generated/server";

/**
 * Links into the app from places that can't open its scheme directly: a
 * Telegram button takes only http(s) URLs, and mail clients drop or block
 * custom schemes. The app has no universal links yet, so a link points at
 * this deployment's site, which redirects to `xolace://`. Each channel
 * names its own targets; anything else is a 404. The redirect records
 * nothing: the `from=` a target carries is for the app to count.
 */

/** The app's scheme (`apps/mobile/app.config.ts`). */
const APP_SCHEME = "xolace://";

/** The https URL that opens `target` under a channel's `prefix`. */
export function siteLink(prefix: string, target: string): string {
	const siteUrl = process.env.CONVEX_SITE_URL;
	if (!siteUrl) {
		throw new Error("CONVEX_SITE_URL is required for app links.");
	}
	return `${siteUrl}${prefix}${target}`;
}

/** The redirect for `${prefix}<target>`, to each target's path in the app. */
export function appLinkRedirect(
	prefix: string,
	targets: Readonly<Record<string, string>>
): PublicHttpAction {
	return httpAction(async (_ctx, request) => {
		const target = new URL(request.url).pathname.slice(prefix.length);
		if (!Object.hasOwn(targets, target)) {
			return new Response("Not found", { status: 404 });
		}
		return new Response(null, {
			headers: { Location: `${APP_SCHEME}${targets[target]}` },
			status: 302,
		});
	});
}
