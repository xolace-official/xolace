import { type ObjectType, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";

export const THEME_SLUGS = [
	"resilience",
	"self-compassion",
	"relationships",
	"grief-and-loss",
	"change",
	"anxiety",
	"identity",
	"loneliness",
	"healing",
	"acceptance",
	"purpose",
	"self-worth",
	"burnout",
	"hope",
	"growth",
	"fear",
	"motivation",
	"inspiration",
] as const;

/**
 * The `quote_themes` bucket for a quote that carries none of `THEME_SLUGS`
 * (`seed` accepts any theme names, or none), so the fallback pick still
 * reaches it. Never a person's preference.
 */
const UNLISTED_THEME = "_unlisted";
const LISTED = new Set<string>(THEME_SLUGS);

const quoteDocValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("quotes"),
	language: v.optional(v.string()),
	source: v.optional(v.string()),
	text: v.string(),
	themes: v.array(v.string()),
	title: v.optional(v.string()),
});

/** Bounds one theme's read; the largest holds 58 of 426 quotes today. */
const MAX_PER_THEME = 1000;
/** Bounds the whole-library read, only before the theme backfill has run. */
const LIBRARY_MAX = 1000;

const randomOf = <T>(items: readonly T[]) =>
	items[Math.floor(Math.random() * items.length)];

function shuffled<T>(items: readonly T[]) {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * Writes the `quote_themes` rows a quote is missing, so the curated pick can
 * reach it by theme: one per theme, plus `UNLISTED_THEME` when none of them is
 * listed, so every quote has at least one row. Idempotent: `seed` calls it for
 * each new quote and `migrations:backfillQuoteThemes` for every older one.
 */
export async function addQuoteThemes(
	ctx: MutationCtx,
	quote: Pick<Doc<"quotes">, "_id" | "themes">
) {
	const have = new Set(
		(
			await ctx.db
				.query("quote_themes")
				.withIndex("by_quoteId", (q) => q.eq("quoteId", quote._id))
				.take(MAX_PER_THEME)
		).map((r) => r.theme)
	);
	const want = new Set(quote.themes);
	if (!quote.themes.some((t) => LISTED.has(t))) {
		want.add(UNLISTED_THEME);
	}
	for (const theme of want) {
		if (!have.has(theme)) {
			await ctx.db.insert("quote_themes", { quoteId: quote._id, theme });
		}
	}
}

/**
 * Pick a curated quote for a user today.
 * Respects theme preferences and avoids already-shown IDs.
 * Falls back to any quote if nothing matches preferences.
 *
 * Runs once per person every night, so it reads `quote_themes` rows (a quote
 * id and a theme) for a few themes and then the one quote it picks, instead
 * of the whole library each time (426 quotes, ~108 KB).
 *
 * 1. An unseen quote from the person's themes, as before.
 * 2. Else an unseen quote from the first theme, in random order, that still
 *    has one. Every quote has a row under a `THEME_SLUGS` theme or
 *    `UNLISTED_THEME`, so all are reachable; a quote is less evenly likely
 *    than in the old pick over the whole library, which nobody can tell apart
 *    in a daily quote.
 * 3. All seen: any quote of a random theme (the cycle resets).
 * 4. Theme backfill not done on this deployment (the oldest quote has no
 *    `quote_themes` row): the old read of every quote. A quote seeded before
 *    the backfill has rows, so an empty table isn't the test. The migration
 *    walks quotes oldest first, so this holds until it starts.
 */
export const pickCuratedQuoteArgs = {
	emotionalProfileId: v.id("emotional_profiles"),
	shownQuoteIds: v.array(v.id("quotes")),
	themes: v.array(v.string()),
};

export async function pickCuratedQuoteFor(
	ctx: QueryCtx,
	args: ObjectType<typeof pickCuratedQuoteArgs>
) {
	const shownSet = new Set<string>(args.shownQuoteIds);
	const idsFor = async (theme: string) =>
		(
			await ctx.db
				.query("quote_themes")
				.withIndex("by_theme", (q) => q.eq("theme", theme))
				.take(MAX_PER_THEME)
		).map((r) => r.quoteId);
	const unseenOf = (ids: Id<"quotes">[]) =>
		[...new Set(ids)].filter((id) => !shownSet.has(id));
	const get = (id: Id<"quotes">) => ctx.db.get("quotes", id);

	const oldest = await ctx.db.query("quotes").first();
	if (oldest === null) {
		return null;
	}
	const backfilled =
		(await ctx.db
			.query("quote_themes")
			.withIndex("by_quoteId", (q) => q.eq("quoteId", oldest._id))
			.first()) !== null;
	if (!backfilled) {
		return await pickFromLibrary(ctx, args, shownSet);
	}

	// 1. Preference-matching quotes first
	if (args.themes.length > 0) {
		const matching = unseenOf(
			(await Promise.all(args.themes.map(idsFor))).flat()
		);
		if (matching.length > 0) {
			return await get(randomOf(matching));
		}
	}

	// 2. Fallback: any unseen quote, one theme at a time
	let anyIds: Id<"quotes">[] = [];
	for (const theme of shuffled([...THEME_SLUGS, UNLISTED_THEME])) {
		const ids = await idsFor(theme);
		const unseen = unseenOf(ids);
		if (unseen.length > 0) {
			return await get(randomOf(unseen));
		}
		if (anyIds.length === 0) {
			anyIds = ids;
		}
	}

	// 3. All quotes seen — pick random (reset cycle)
	return anyIds.length > 0 ? await get(randomOf(anyIds)) : null;
}

/** 4. Not backfilled yet: every quote, as before quote_themes. */
async function pickFromLibrary(
	ctx: QueryCtx,
	args: ObjectType<typeof pickCuratedQuoteArgs>,
	shownSet: Set<string>
) {
	const allQuotes = await ctx.db.query("quotes").take(LIBRARY_MAX);
	const themed =
		args.themes.length > 0
			? allQuotes.filter(
					(q) =>
						!shownSet.has(q._id) &&
						q.themes.some((t) => args.themes.includes(t))
				)
			: [];
	const unseen = allQuotes.filter((q) => !shownSet.has(q._id));
	const pool =
		themed.length > 0 ? themed : unseen.length > 0 ? unseen : allQuotes;
	return pool.length > 0 ? randomOf(pool) : null;
}

export const pickCuratedQuote = internalQuery({
	args: pickCuratedQuoteArgs,
	handler: pickCuratedQuoteFor,
	returns: v.union(quoteDocValidator, v.null()),
});

/**
 * Get total count of quotes in library (for health checks).
 */
export const count = internalQuery({
	args: {},
	handler: async (ctx) => {
		const all = await ctx.db.query("quotes").take(1000);
		return all.length;
	},
});

/**
 * Seed the quote library. Idempotent — skips if count ≥ minCount.
 * Run this once on prod deployment before enabling the cron.
 */
export const seed = internalMutation({
	args: {
		force: v.optional(v.boolean()),
		quotes: v.array(
			v.object({
				language: v.optional(v.string()),
				source: v.optional(v.string()),
				text: v.string(),
				themes: v.array(v.string()),
				title: v.optional(v.string()),
			})
		),
	},
	handler: async (ctx, args) => {
		const existingRows = await ctx.db.query("quotes").take(1000);
		if (!args.force && existingRows.length > 0) {
			console.log(
				"[quotes:seed] Library not empty, skipping. Pass force=true to override."
			);
			return { skipped: true };
		}

		const existingTexts = new Set(existingRows.map((r) => r.text));
		let inserted = 0;
		for (const q of args.quotes) {
			if (existingTexts.has(q.text)) {
				continue;
			}
			const quoteId = await ctx.db.insert("quotes", {
				language: q.language ?? "en",
				source: q.source,
				text: q.text,
				themes: q.themes,
				title: q.title,
			});
			await addQuoteThemes(ctx, { _id: quoteId, themes: q.themes });
			existingTexts.add(q.text);
			inserted++;
		}
		console.log(`[quotes:seed] Inserted ${inserted} quotes.`);
		return { inserted };
	},
});
