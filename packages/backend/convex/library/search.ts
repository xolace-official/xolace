import {
	paginationOptsValidator,
	paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import {
	activeTopics,
	familyValidator,
	thumbUrlFor,
	toTrackItem,
	trackItemValidator,
} from "../browse";
import { requireAuth } from "../lib/auth";
import { isCrisisQuery } from "./crisisTerms";
import { cardItemValidator, coverOf, toListItem } from "./entries";
import { withCardSignals } from "./reads";
import { asWords } from "./searchText";

/**
 * Browse search (#549, #550, CONTEXT.md "Browse search"). Lantern entries and
 * tracks match the `searchText` ingest writes (the `migrations:backfill*SearchText`
 * migrations fill older rows) — active rows only, never a retired one. Each
 * section is ranked on its own; the `*Page` queries back a section's See all (#551).
 */

const MAX_QUERY = 100;
// The results screen shows 5 per section; the 6th only tells it to offer See all.
const MAX_RESULTS = 6;

const queryWords = (query: string) => asWords(query.slice(0, MAX_QUERY));
const titleWords = (s: string) =>
	asWords(s)
		.replace(/[^\p{L}\p{N}\s]+/gu, " ")
		.split(/\s+/)
		.filter(Boolean);

export const searchEntries = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const text = queryWords(args.query);
		if (!text) {
			return [];
		}
		const rows = await entriesMatching(ctx, text).take(MAX_RESULTS);
		return await withCardSignals(
			ctx,
			profile._id,
			await Promise.all(rows.map(toListItem))
		);
	},
	returns: v.array(cardItemValidator),
});

const entriesMatching = (ctx: QueryCtx, text: string) =>
	ctx.db
		.query("library_entries")
		.withSearchIndex("search_searchText", (q) =>
			q.search("searchText", text).eq("active", true)
		);

const tracksMatching = (
	ctx: QueryCtx,
	family: Doc<"audio_tracks">["family"],
	text: string
) =>
	ctx.db
		.query("audio_tracks")
		.withSearchIndex("search_searchText", (q) =>
			q.search("searchText", text).eq("active", true).eq("family", family)
		);

const searchFamily = (
	ctx: QueryCtx,
	family: Doc<"audio_tracks">["family"],
	text: string
) => tracksMatching(ctx, family, text).take(MAX_RESULTS);

const NOTHING = { continueCursor: "", isDone: true, page: [] };

/** Lantern's See all: the same matches as `searchEntries`, a page at a time. */
export const searchEntriesPage = query({
	args: { paginationOpts: paginationOptsValidator, query: v.string() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const text = queryWords(args.query);
		if (!text) {
			return NOTHING;
		}
		const result = await entriesMatching(ctx, text).paginate(
			args.paginationOpts
		);
		const items = await Promise.all(result.page.map(toListItem));
		return { ...result, page: await withCardSignals(ctx, profile._id, items) };
	},
	returns: paginationResultValidator(cardItemValidator),
});

/** Support audio's or Music's See all: the same matches as `searchCatalogue`, a page at a time. */
export const searchTracksPage = query({
	args: {
		family: familyValidator,
		paginationOpts: paginationOptsValidator,
		query: v.string(),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const text = queryWords(args.query);
		if (!text) {
			return NOTHING;
		}
		const result = await tracksMatching(ctx, args.family, text).paginate(
			args.paginationOpts
		);
		return { ...result, page: await Promise.all(result.page.map(toTrackItem)) };
	},
	returns: paginationResultValidator(trackItemValidator),
});

const placeValidator = v.object({
	imageUrl: v.optional(v.string()),
	kind: v.union(v.literal("hub"), v.literal("topic")),
	slug: v.string(),
	title: v.string(),
});

/**
 * Hubs & topics matching a query. Hubs and topics are small, bounded tables, so
 * they're matched in memory on title — a topic only while it has an active
 * track (the topic grid's own rule). Every query word a prefix of some title
 * word, any order ("sa" finds "Sad days", "a" does not list every title); a
 * title that starts with the query ranks first. Punctuation is dropped so
 * "sad?" still matches.
 */
async function placesMatching(ctx: QueryCtx, text: string) {
	const words = titleWords(text);
	const matches = (title: string) => {
		const tw = titleWords(title);
		return (
			words.length > 0 && words.every((w) => tw.some((t) => t.startsWith(w)))
		);
	};
	const rank = (title: string) =>
		asWords(title).startsWith(words.join(" ")) ? 0 : 1;

	const [hubs, topics] = await Promise.all([
		ctx.db
			.query("library_hubs")
			.withIndex("by_active", (q) => q.eq("active", true))
			.take(50), // ponytail: same ceiling as listHubs; page if hubs ever pass 50
		activeTopics(ctx),
	]);

	return (
		await Promise.all([
			...hubs
				.filter((h) => matches(h.title))
				.map(async (h) => ({
					imageUrl: await coverOf(h),
					kind: "hub" as const,
					slug: h.slug,
					title: h.title,
				})),
			...topics
				.filter((t) => matches(t.title))
				.map(async (t) => ({
					imageUrl: await thumbUrlFor(t.thumbKey),
					kind: "topic" as const,
					slug: t.slug,
					title: t.title,
				})),
		])
	).sort((a, b) => rank(a.title) - rank(b.title));
}

/** Hubs & topics' See all: the same places as `searchCatalogue`, without its track searches. */
export const searchPlaces = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const text = queryWords(args.query);
		if (!text) {
			return [];
		}
		return await placesMatching(ctx, text);
	},
	returns: v.array(placeValidator),
});

/**
 * The Support audio, Music, and Hubs & topics sections, plus whether the query
 * gets the Need someone now? row (#552).
 */
export const searchCatalogue = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const text = queryWords(args.query);
		if (!text) {
			return { music: [], needSomeone: false, places: [], support: [] };
		}

		const [support, music, places] = await Promise.all([
			searchFamily(ctx, "support", text),
			searchFamily(ctx, "music", text),
			placesMatching(ctx, text),
		]);

		return {
			music: await Promise.all(music.map(toTrackItem)),
			// Full raw query: the index cap must not hide a crisis term past it.
			needSomeone: isCrisisQuery(args.query),
			places,
			support: await Promise.all(support.map(toTrackItem)),
		};
	},
	returns: v.object({
		music: v.array(trackItemValidator),
		/** The query matched a crisis term: show the Need someone now? row (#552). */
		needSomeone: v.boolean(),
		places: v.array(placeValidator),
		support: v.array(trackItemValidator),
	}),
});
