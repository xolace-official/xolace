/**
 * The name a screen is reported to analytics under. Most routes report their path. A route whose
 * path carries an id that must never reach analytics reports its pattern instead: a letter's id in
 * `/letters/read/<id>` would tie that letter to the recipient's PostHog person (letters spec §13).
 */
const MASKED: readonly { pattern: RegExp; name: string }[] = [
	{ name: "/letters/read/[id]", pattern: /^\/letters\/read\/[^/]+\/?$/ },
];

export function screenName(pathname: string): string {
	return MASKED.find((m) => m.pattern.test(pathname))?.name ?? pathname;
}
