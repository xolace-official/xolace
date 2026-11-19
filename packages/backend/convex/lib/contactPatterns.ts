/**
 * Ways to reach someone outside Xolace, as patterns: the one list chat's Stream
 * blocklist (`lib/streamSetup`) and the letters check (`letters/decide`) both
 * read, so a pattern added for one covers the other.
 *
 * Each pattern is a `source` and JS `flags`, not a Go regex: Stream's matcher
 * takes the case flag inline (`(?i)`), which JS can't parse. `streamSetup` adds
 * it back. Sources stay inside RE2 (no lookaround, no backreferences), which
 * Stream needs.
 *
 * Pure and client-safe: no Stream types, no Convex imports.
 */

export type ContactPattern = {
	flags: string;
	source: string;
	/**
	 * Fewer digits than this in a match is not a hit here (`2019-2023` is a
	 * range, not a phone). Stream can't count, so its list leaves this out.
	 */
	minDigits?: number;
};

/** The digits a phone number needs before it's one. */
const PHONE_MIN_DIGITS = 9;

/** Shared with Stream's `contact_leak` blocklist, in its order. */
export const CONTACT_PATTERNS: readonly ContactPattern[] = [
	// Phone-number shapes: 9+ digits with optional +, spaces, dots, dashes, parens.
	{
		flags: "",
		minDigits: PHONE_MIN_DIGITS,
		source: String.raw`\+?\d[\d\s().-]{7,}\d`,
	},
	// @handle
	{ flags: "", source: String.raw`(^|\s)@[A-Za-z0-9_.]{3,}` },
	// Off-platform invitations. The unambiguous app names stand alone; the
	// short ones ("ig", "snap", "signal") are ordinary English and only count
	// as "my ig" / "on snap" / "via signal".
	{
		flags: "i",
		source: String.raw`\b(whatsapp|telegram|snapchat|instagram|insta)\b`,
	},
	{ flags: "i", source: String.raw`\b(my|on|via)\s+(ig|snap|signal)\b` },
];

/**
 * An email address. Letters only: chat's Stream list predates it and changing
 * that list is its own decision.
 */
const EMAIL_PATTERN: ContactPattern = {
	flags: "i",
	source: String.raw`[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}`,
};

/**
 * A link: a scheme, `www.`, or a bare domain on a common TLD. Stream has its
 * own (`url_detection_v1`), so only letters read this one.
 */
const URL_PATTERN: ContactPattern = {
	flags: "i",
	source: String.raw`(\bhttps?://|\bwww\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|co|me|app|ly|gg|link|xyz|info|tv)\b`,
};

/** The pattern as Stream's blocklist takes it: the case flag inline. */
export function streamRegexOf(pattern: ContactPattern): string {
	return pattern.flags.includes("i") ? `(?i)${pattern.source}` : pattern.source;
}

function hits(pattern: ContactPattern, text: string): boolean {
	const re = new RegExp(pattern.source, `${pattern.flags}g`);
	for (const match of text.matchAll(re)) {
		const digits = match[0].replace(/\D/g, "").length;
		if (digits >= (pattern.minDigits ?? 0)) {
			return true;
		}
	}
	return false;
}

/** A phone number, @handle, email or off-platform invitation in `text`. */
export function contactLeakIn(text: string): boolean {
	return (
		CONTACT_PATTERNS.some((p) => hits(p, text)) || hits(EMAIL_PATTERN, text)
	);
}

/** A link in `text`. */
export function urlIn(text: string): boolean {
	return hits(URL_PATTERN, text);
}
