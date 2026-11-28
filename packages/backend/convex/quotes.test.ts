// @vitest-environment edge-runtime
/**
 * The nightly curated quote pick, pinned as it behaves: an unseen quote of the
 * person's themes, else any unseen one, else any at all. It reads
 * `quote_themes` rather than the whole library, and still picks on a
 * deployment whose quotes predate that table (before the backfill).
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { addQuoteThemes, pickCuratedQuoteFor } from "./quotes";
import { asNewUser, type SeededUser } from "./test/harness.helpers";
import { aggregatesMock } from "./test/mocks.helpers";

vi.mock("./lib/aggregates", () => aggregatesMock());

type QuoteIn = { text: string; themes: string[] };

const seedQuotes = (user: SeededUser, quotes: QuoteIn[], force?: boolean) =>
	user.root.mutation(internal.quotes.seed, { force, quotes });

const idsByText = (user: SeededUser) =>
	user.root.run(async (ctx) => {
		const rows = await ctx.db.query("quotes").take(100);
		return Object.fromEntries(rows.map((r) => [r.text, r._id])) as Record<
			string,
			Id<"quotes">
		>;
	});

const pick = async (
	user: SeededUser,
	themes: string[],
	shownQuoteIds: Id<"quotes">[] = []
) =>
	(
		await user.root.query(internal.quotes.pickCuratedQuote, {
			emotionalProfileId: user.profileId,
			shownQuoteIds,
			themes,
		})
	)?.text;

describe("quotes.pickCuratedQuote", () => {
	it("seeding writes a theme row per theme of each quote", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [
			{ text: "a", themes: ["hope", "growth"] },
			{ text: "b", themes: ["fear"] },
		]);
		const rows = await user.root.run(async (ctx) =>
			(await ctx.db.query("quote_themes").take(100)).map((r) => r.theme).sort()
		);
		expect(rows).toEqual(["fear", "growth", "hope"]);
	});

	it("files a quote with no listed theme under the unlisted bucket", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [
			{ text: "none", themes: [] },
			{ text: "custom", themes: ["custom"] },
		]);
		const rows = await user.root.run(async (ctx) =>
			(await ctx.db.query("quote_themes").take(100)).map((r) => r.theme).sort()
		);
		expect(rows).toEqual(["_unlisted", "_unlisted", "custom"]);
	});

	it("reaches quotes with no listed theme once the others are seen", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [
			{ text: "hope", themes: ["hope"] },
			{ text: "custom", themes: ["custom"] },
		]);
		const ids = await idsByText(user);

		expect(await pick(user, [], [ids.hope])).toBe("custom");
		expect(await pick(user, ["hope"], [ids.hope])).toBe("custom");
	});

	it("picks an unseen quote of the person's themes", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [
			{ text: "hope-seen", themes: ["hope"] },
			{ text: "hope-new", themes: ["hope", "growth"] },
			{ text: "fear", themes: ["fear"] },
		]);
		const ids = await idsByText(user);

		expect(await pick(user, ["hope"], [ids["hope-seen"]])).toBe("hope-new");
	});

	it("falls back to any unseen quote when the person's themes are used up", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [
			{ text: "hope", themes: ["hope"] },
			{ text: "fear", themes: ["fear"] },
		]);
		const ids = await idsByText(user);

		expect(await pick(user, ["hope"], [ids.hope])).toBe("fear");
		expect(await pick(user, [], [ids.hope])).toBe("fear");
	});

	it("still picks once every quote has been seen", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [{ text: "only", themes: ["hope"] }]);
		const ids = await idsByText(user);

		expect(await pick(user, ["hope"], [ids.only])).toBe("only");
	});

	it("is null for an empty library", async () => {
		const user = await asNewUser();
		expect(await pick(user, ["hope"])).toBeUndefined();
	});

	it("reads the theme rows and the one quote it picks, not the library", async () => {
		const user = await asNewUser();
		await seedQuotes(user, [
			{ text: "hope", themes: ["hope"] },
			{ text: "fear", themes: ["fear"] },
		]);
		// Proxies `ctx.db` inside a run, so the query's own reads of `quotes` are
		// recorded by method: the backfill check's `.first()` (the oldest quote)
		// is the only one, never the library read's `.take()`.
		const counted = await user.root.run(async (ctx) => {
			const quoteReads: string[] = [];
			const real = ctx.db.query.bind(ctx.db);
			const db = new Proxy(ctx.db, {
				get(target, prop, receiver) {
					if (prop === "query") {
						return (table: "quotes") => {
							const q = real(table);
							if (table !== "quotes") {
								return q;
							}
							return new Proxy(q, {
								get(qt, qp, qr) {
									quoteReads.push(String(qp));
									const value = Reflect.get(qt, qp, qr);
									return typeof value === "function" ? value.bind(qt) : value;
								},
							});
						};
					}
					const value = Reflect.get(target, prop, receiver);
					return typeof value === "function" ? value.bind(target) : value;
				},
			});
			const quote = await pickCuratedQuoteFor({ ...ctx, db } as QueryCtx, {
				emotionalProfileId: user.profileId,
				shownQuoteIds: [],
				themes: ["hope"],
			});
			return { quote: quote?.text, quoteReads };
		});

		expect(counted).toEqual({ quote: "hope", quoteReads: ["first"] });
	});

	describe("before the theme backfill", () => {
		/** Quotes written the old way, with no `quote_themes` rows. */
		const insertBare = (user: SeededUser, quotes: QuoteIn[]) =>
			user.root.run(async (ctx) => {
				for (const q of quotes) {
					await ctx.db.insert("quotes", { language: "en", ...q });
				}
			});

		it("still picks, from the person's themes first", async () => {
			const user = await asNewUser();
			await insertBare(user, [
				{ text: "hope", themes: ["hope"] },
				{ text: "fear", themes: ["fear"] },
			]);

			expect(await pick(user, ["fear"])).toBe("fear");
		});

		it("still reaches the older quotes when a new one was seeded first", async () => {
			const user = await asNewUser();
			await insertBare(user, [{ text: "old", themes: ["hope"] }]);
			await seedQuotes(user, [{ text: "new", themes: ["fear"] }], true);
			const ids = await idsByText(user);

			expect(await pick(user, [], [ids.new])).toBe("old");
			expect(await pick(user, ["hope"])).toBe("old");
		});

		it("the backfill writes each missing row once, however often it runs", async () => {
			const user = await asNewUser();
			await insertBare(user, [{ text: "a", themes: ["hope", "growth"] }]);
			const themes = await user.root.run(async (ctx) => {
				const quote = (await ctx.db.query("quotes").first())!;
				await addQuoteThemes(ctx, quote);
				await addQuoteThemes(ctx, quote);
				return (await ctx.db.query("quote_themes").take(100))
					.map((r) => r.theme)
					.sort();
			});
			expect(themes).toEqual(["growth", "hope"]);
		});
	});
});
