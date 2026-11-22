import { bareLinks, type FoundLink } from "./bare-links";

const TITLE_MAX = 80;

const MARKDOWN_LINK = /(!?)\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const EMPHASIS =
	/(\*\*|__|~~|`)(.+?)\1|(?<![\w*])[*_](?!\s)(.+?)(?<!\s)[*_](?![\w*])/g;
const LINE_MARKS =
	/^[ \t]*(?:>[ \t]?)*[ \t]*(?:#{1,6}[ \t]+|[-*+][ \t]+|\d+\.[ \t]+)?/gm;
const ESCAPED = /\\([\\`*_{}[\]()#+\-.!~>|])/g;
const HELD = 0xe0_00;
const HELD_CHAR = /[\ue000-\ue0ff]/g;
const OPENABLE = /^(https?:\/\/|mailto:)/i;

export function isOpenableLink(url: string): boolean {
	return OPENABLE.test(url);
}

export function plainText(markdown: string): string {
	let text = markdown
		.replace(ESCAPED, (_, mark: string) =>
			String.fromCharCode(HELD + mark.charCodeAt(0))
		)
		.replace(LINE_MARKS, "")
		.replace(MARKDOWN_LINK, "$2");
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

export function postLinks(markdown: string): FoundLink[] {
	const named = [...markdown.matchAll(MARKDOWN_LINK)]
		.filter((m) => m[1] !== "!")
		.map((m) => ({ url: m[3] ?? "", words: plainText(m[2] ?? "") }));
	const rest = markdown.replace(MARKDOWN_LINK, (m) => " ".repeat(m.length));
	const seen = new Set<string>();
	return [...named, ...bareLinks(rest)].filter(({ url }) => {
		if (!isOpenableLink(url) || seen.has(url)) {
			return false;
		}
		seen.add(url);
		return true;
	});
}

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
