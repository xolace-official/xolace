/** The old reader's and Browse search's copy helpers (#409). Lantern's own live in
 * `features/lantern`; these go with the old reader (S9b). */

import { capitalise } from "@/features/library/reader/reader-copy";

const words = (slug: string) => slug.replace(/-/g, " ");

export const facetLabel = (slug: string) => capitalise(words(slug));

// Hand-rolled compact count: Hermes' Intl lacks `notation: 'compact'` on some Android builds.
const compact = (n: number) =>
	n < 1000 ? `${n}` : `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;

/** "4 min read", "· 6 min listen" with audio (#411), "· 1.2k views" once opened (#410). */
export const readTimeLine = (readMin: number, views = 0, listenMin?: number) =>
	[
		`${readMin} min read`,
		listenMin && `${listenMin} min listen`,
		views > 0 && `${compact(views)} ${views === 1 ? "view" : "views"}`,
	]
		.filter(Boolean)
		.join(" · ");
