import type { Doc } from "../_generated/dataModel";
import { topicSlug } from "../ai/paths/catalog";

/**
 * Browse search text (#549, #550, CONTEXT.md "Browse search"): what ingest
 * writes and the backfills recompute. Pure, so track ingest can use it without
 * pulling the search queries' imports along.
 */

/** Lowercase, with slug separators as spaces: "self-doubt" → "self doubt". */
export const asWords = (s: string) =>
	s.toLowerCase().replace(/[-_]+/g, " ").trim();

const joinWords = (parts: (string | undefined)[]) =>
	parts
		.filter((s): s is string => !!s)
		.map(asWords)
		.join(" ");

export const searchTextOf = (
	e: Pick<Doc<"library_entries">, "title" | "dek" | "storyDescriptor">,
	facets: Iterable<{ slug: string }>
) =>
	// The primary subject comes in as its `subject` facet.
	joinWords([
		e.title,
		e.dek,
		e.storyDescriptor,
		...Array.from(facets, (f) => f.slug),
	]);

/**
 * Title, topic, curated tags, narrators and series title. Only Music adds its
 * raw source tags (Pixabay mood/instrument words) — Support's are not curated
 * enough to match on — plus its secondary topic, what it's for, and the
 * instruments and nature sounds the listening review heard.
 */
export const trackSearchTextOf = (
	t: Pick<
		Doc<"audio_tracks">,
		| "family"
		| "title"
		| "topic"
		| "tags"
		| "sourceTags"
		| "narrators"
		| "seriesTitle"
		| "secondaryTopic"
		| "sound"
		| "whatItsFor"
	>
) =>
	joinWords([
		t.title,
		topicSlug(t.topic),
		...t.tags,
		...(t.narrators ?? []),
		t.seriesTitle,
		...(t.family === "music"
			? [
					...t.sourceTags,
					t.secondaryTopic && topicSlug(t.secondaryTopic),
					t.whatItsFor,
					...(t.sound?.instruments ?? []),
					...(t.sound?.natureSounds ?? []),
				]
			: []),
	]);
