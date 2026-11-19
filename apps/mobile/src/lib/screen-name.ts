/**
 * What analytics may see of a route. A letter's id must never reach them: it would tie that
 * letter to a person (letters spec §13). Two exporters see routes: PostHog's screen events
 * (`screenName`) and EAS Observe's navigation metrics (`OBSERVE_FILTERED_PARAMS`).
 */
const MASKED: readonly { pattern: RegExp; name: string }[] = [
	{ name: "/letters/read/[id]", pattern: /^\/letters\/read\/[^/]+\/?$/ },
];

/** The name a screen is reported to PostHog under: its path, or its pattern when the path has an id. */
export function screenName(pathname: string): string {
	return MASKED.find((m) => m.pattern.test(pathname))?.name ?? pathname;
}

/**
 * Route params EAS Observe's expo-router integration drops from navigation metrics. A route that
 * has one also loses its `url`, the pathname, so `/letters/read/<id>` goes unnamed too.
 * - `q`: the raw Browse search query (may be a crisis term, see crisisTerms.ts).
 * - `id`: a letter's (`/letters/read/[id]`, `/letters/report?id=`).
 */
export const OBSERVE_FILTERED_PARAMS: readonly string[] = ["q", "id"];
