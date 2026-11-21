/**
 * Lantern share links. A shared entry links to its page on the public site:
 * with the app installed it opens the entry (Universal Links / App Links,
 * `app.config.ts`); without it the site shows a preview, never the body.
 * In src/lib because both Lantern and Browse search share entries.
 */
const SITE = "https://www.xolaceinc.com";
// Both hosts are associated with the app; the site redirects the bare one.
const SITE_ORIGIN = /^https:\/\/(?:www\.)?xolaceinc\.com(?=[/?#]|$)/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const LANTERN_PATH = /^\/?lantern\/([^/?#]+)\/?(?:\?([^#]*))?(?:#.*)?$/;
const HAS_FROM = /(?:^|&)from=/;

/** The link a Lantern share sends: the entry's page on the site. */
export const lanternShareUrl = (slug: string) =>
	`${SITE}/lantern/${encodeURIComponent(slug)}?from=share`;

/**
 * An incoming `/lantern/<slug>` (from the site, or `xolace://lantern/<slug>`)
 * as the reader route `library/<slug>`, keeping its query and `from=share`
 * for analytics. Anything else comes back unchanged. Used by `+native-intent`.
 */
export function lanternSystemPath(path: string): string {
	const rest = SITE_ORIGIN.test(path)
		? path.replace(SITE_ORIGIN, "")
		: path.replace(ANY_SCHEME, "");
	const match = LANTERN_PATH.exec(rest);
	if (!match) {
		return path;
	}
	const [, slug, query = ""] = match;
	const params = HAS_FROM.test(query)
		? query
		: [query, "from=share"].filter(Boolean).join("&");
	return `/library/${slug}?${params}`;
}
