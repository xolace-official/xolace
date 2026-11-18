/** A post's text: the title split from the body, the words without their markdown, and its
 * links. Pure. */

/** A first paragraph this short, followed by more, reads as the post's title. */
const TITLE_MAX = 80;

/** `[words](target)`, or an image's `![words](target)`; a target may hold one level of
 * parentheses (`…/wiki/Foo_(bar)`). */
const MARKDOWN_LINK = /(!?)\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const BARE_URL = /https?:\/\/(?:[^\s()<>\]]|\([^\s()<>]*\))+/g;
const EMPHASIS =
	/(\*\*|__|~~|`)(.+?)\1|(?<![\w*])[*_](?!\s)(.+?)(?<!\s)[*_](?![\w*])/g;
/** A line's block marks: quotes (nested too), then a heading's hashes or a list's bullet or
 * number. */
const LINE_MARKS =
	/^[ \t]*(?:>[ \t]?)*[ \t]*(?:#{1,6}[ \t]+|[-*+][ \t]+|\d+\.[ \t]+)?/gm;
/** A backslash-escaped mark (`\*` is a literal star). */
const ESCAPED = /\\([\\`*_{}[\]()#+\-.!~>|])/g;
/** Escaped marks wait in the private-use area while the marks around them come off. */
const HELD = 0xe0_00;
const HELD_CHAR = /[\ue000-\ue0ff]/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
/** The only links a post opens: the web and email. Not `tel:`, `sms:`, or another app's. */
const OPENABLE = /^(https?:\/\/|mailto:)/i;

/** Whether a post may open this link, from a tap or VoiceOver. */
export function isOpenableLink(url: string): boolean {
	return OPENABLE.test(url);
}

/** What a reader hears or a title shows: the words without the markdown around them. */
export function plainText(markdown: string): string {
	let text = markdown
		.replace(ESCAPED, (_, mark: string) =>
			String.fromCharCode(HELD + mark.charCodeAt(0))
		)
		.replace(LINE_MARKS, "")
		.replace(MARKDOWN_LINK, "$2");
	// Again until nothing changes, so nested marks (`***both***`, `**bold _italic_**`) clear.
	let before: string;
	do {
		before = text;
		text = text.replace(
			EMPHASIS,
			(_, _mark, wrapped?: string, single?: string) => wrapped ?? single ?? ""
		);
	} while (text !== before);
	return text.replace(HELD_CHAR, (held) =>
		String.fromCharCode(held.charCodeAt(0) - HELD)
	);
}

/** A link in a post: where it goes, and the words it shows (a markdown link's, or the address). */
export type FoundLink = { url: string; words: string };

/** Every link in a post it may open, in order, once each: markdown links, then bare URLs. An
 * image isn't one: Stream doesn't draw it. */
export function postLinks(markdown: string): FoundLink[] {
	const named = [...markdown.matchAll(MARKDOWN_LINK)]
		.filter((m) => m[1] !== "!")
		.map((m) => ({ url: m[3] ?? "", words: plainText(m[2] ?? "") }));
	const bare = [...markdown.replace(MARKDOWN_LINK, "").matchAll(BARE_URL)].map(
		(m) => {
			const url = m[0].replace(TRAILING_PUNCTUATION, "");
			return { url, words: url };
		}
	);
	const seen = new Set<string>();
	return [...named, ...bare].filter(({ url }) => {
		if (!isOpenableLink(url) || seen.has(url)) {
			return false;
		}
		seen.add(url);
		return true;
	});
}

/** Posts are plain messages. A short first paragraph with more under it is the title (the
 * prototype's cards have one); anything else is all body. A paragraph with a link in it stays
 * body, where Stream draws the link and a tap opens it: the title is plain text. */
export function splitPost(text: string): {
	title: string | null;
	body: string;
} {
	const paragraphs = text
		.trim()
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
	const [first, ...rest] = paragraphs;
	if (
		first &&
		rest.length > 0 &&
		!first.includes("\n") &&
		first.length <= TITLE_MAX &&
		postLinks(first).length === 0
	) {
		return { body: rest.join("\n\n"), title: first };
	}
	return { body: paragraphs.join("\n\n"), title: null };
}
