const COMBINING_MARKS = /[̀-ͯ]/g;
const NOT_SLUG = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-|-$/g;

/** `Too Many Small Doors` → `too-many-small-doors` */
export function slugify(text: string) {
	return text
		.normalize("NFKD")
		.replaceAll(COMBINING_MARKS, "")
		.toLowerCase()
		.replaceAll(NOT_SLUG, "-")
		.replaceAll(EDGE_DASHES, "");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(text: string) {
	return SLUG.test(text);
}

/**
 * Slugs that name a static page beside the editor route (`/library/new`,
 * `/audio/topics`), so an item with one could never be opened.
 */
export const RESERVED_SLUGS = {
	entry: ["hubs", "new", "sources"],
	track: ["new", "topics"],
} as const satisfies Record<string, readonly string[]>;

export const isReservedSlug = (
	kind: keyof typeof RESERVED_SLUGS,
	slug: string
) => (RESERVED_SLUGS[kind] as readonly string[]).includes(slug);
