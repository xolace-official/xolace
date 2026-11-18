/** The links Stream makes tappable in a post's plain words, so VoiceOver has an action for each:
 * a web address with or without its scheme (`xolace.app/lantern` opens as `http://…`, as Stream
 * opens it) and an email address (`mailto:`). Stream finds them with linkifyjs, which knows
 * every top-level domain; a scheme-less address here needs one of the common ones below, so a
 * rare domain can be tappable with no action. Pure. */

/** A link in a post: where it goes, and the words it shows (a markdown link's, or the address). */
export type FoundLink = { url: string; words: string };

/** Scheme-less addresses count only under these, so "readme.md" or "Node.js" stay words. */
const TLDS =
	"com|org|net|edu|gov|app|io|co|dev|ai|me|info|xyz|link|health|care|help|online|site|uk|us|ca|au|nz|ie|in|ng|gh|ke|za|de|fr|es|it|nl|eu|ly|so|tv";
const PATH = String.raw`(?:\/(?:[^\s()<>\]]|\([^\s()<>]*\))*)?`;
const WEB = /https?:\/\/(?:[^\s()<>\]]|\([^\s()<>]*\))+/gi;
const EMAIL =
	/(?<![\w.+-])[\w.+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}(?![\w-])/gi;
const DOMAIN = new RegExp(
	String.raw`(?<![\w@.\/:-])(?:[a-z\d-]+\.)+(?:${TLDS})(?::\d+)?${PATH}(?![\w@-])`,
	"gi"
);
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

type Found = FoundLink & { at: number };

/** Each match, its trailing full stop or comma left off, and blanked out of the text so a later
 * pattern doesn't find part of it again (an email's domain, a web address's host). */
function take(
	text: string,
	pattern: RegExp,
	toUrl: (raw: string) => string
): { found: Found[]; rest: string } {
	const found: Found[] = [];
	const rest = text.replace(pattern, (match: string, at: number) => {
		const raw = match.replace(TRAILING_PUNCTUATION, "");
		found.push({ at, url: toUrl(raw), words: raw });
		return " ".repeat(match.length);
	});
	return { found, rest };
}

/** The links in plain words (markdown links already blanked out), in the order written. */
export function bareLinks(text: string): FoundLink[] {
	const web = take(text, WEB, (raw) => raw);
	const email = take(web.rest, EMAIL, (raw) => `mailto:${raw}`);
	const domain = take(email.rest, DOMAIN, (raw) => `http://${raw}`);
	return [...web.found, ...email.found, ...domain.found]
		.sort((a, b) => a.at - b.at)
		.map(({ url, words }) => ({ url, words }));
}
