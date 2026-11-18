/** A post's text: the title split from the body, the words without their markdown, and its
 * links. Pure. */

/** A first paragraph this short, followed by more, reads as the post's title. */
const TITLE_MAX = 80;

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)<>\]]+/g;
const EMPHASIS =
	/(\*\*|__|~~|`)(.+?)\1|(?<![\w*])[*_](?!\s)(.+?)(?<!\s)[*_](?![\w*])/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** What a reader hears or a title shows: the words without the markdown around them. */
export function plainText(markdown: string): string {
	return markdown
		.replace(MARKDOWN_LINK, "$1")
		.replace(EMPHASIS, (_, _mark, wrapped, single) => wrapped ?? single);
}

/** Every link in a post, in order, once each: markdown links' targets, then bare URLs. */
export function postLinks(markdown: string): string[] {
	const named = [...markdown.matchAll(MARKDOWN_LINK)].map((m) => m[2] ?? "");
	const bare = [...markdown.replace(MARKDOWN_LINK, "").matchAll(BARE_URL)].map(
		(m) => m[0].replace(TRAILING_PUNCTUATION, "")
	);
	return [...new Set([...named, ...bare])].filter(Boolean);
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
