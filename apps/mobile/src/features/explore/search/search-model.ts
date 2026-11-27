import { SEARCH, type SearchSection } from "@/features/explore/copy";

/** Rows a results section shows before "See all". */
export const PREVIEW = 5;

/** Rows a see-all page loads at a time. */
export const PAGE_SIZE = 20;

export const capitalise = (s: string) =>
	s[0].toUpperCase() + s.slice(1).toLowerCase();

export const facetLabel = (slug: string) => capitalise(slug.replace(/-/g, " "));

export const readTimeLine = (readMin: number, views = 0, listenMin?: number) =>
	[
		SEARCH.readMin(readMin),
		listenMin && SEARCH.listenMin(listenMin),
		views > 0 && SEARCH.views(views),
	]
		.filter(Boolean)
		.join(" · ");

export const trackSubtitle = (track: {
	episodeNumber?: number;
	attribution?: string;
}) =>
	track.episodeNumber === undefined
		? track.attribution
		: `${SEARCH.episode(track.episodeNumber)}${track.attribution ? ` · ${track.attribution}` : ""}`;

/** The see-all screen's section from its route param; Lantern when unknown. */
export const sectionOf = (param: string | undefined): SearchSection =>
	param && Object.hasOwn(SEARCH.section, param)
		? (param as SearchSection)
		: "lantern";

/** "See all" only once this query's own results are in and there are more than the preview. */
export const showsSeeAll = (
	query: string | undefined,
	fresh: boolean,
	count: number
) => Boolean(fresh && query) && count > PREVIEW;
