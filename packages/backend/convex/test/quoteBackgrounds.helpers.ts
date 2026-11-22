/**
 * Seeds the `quote_backgrounds` catalogue (B18) for tests that choose a
 * background. Rows go straight in with `t.run`: the catalogue is filled by the
 * upload script in a real deployment, so no client mutation writes it.
 */
import type { TestConvex } from "convex-test";
import type { Doc } from "../_generated/dataModel";
import type schema from "../schema";

type Row = Omit<Doc<"quote_backgrounds">, "_id" | "_creationTime">;

/** Free stills and a Plus loop, enough for every preference test. */
export const SEED_BACKGROUNDS: readonly Pick<
	Row,
	"key" | "kind" | "name" | "plus"
>[] = [
	{ key: "poster", kind: "still", name: "Poster", plus: false },
	{ key: "first-light", kind: "still", name: "First light", plus: false },
	{ key: "night", kind: "still", name: "Night", plus: false },
	{ key: "deep-forest", kind: "still", name: "Deep forest", plus: true },
	{ key: "rain-window", kind: "loop", name: "Rain on glass", plus: false },
	{ key: "quiet-lake", kind: "loop", name: "Quiet lake", plus: true },
];

export async function seedQuoteBackgrounds(
	t: TestConvex<typeof schema>,
	rows: readonly (Partial<Row> & Pick<Row, "key">)[] = SEED_BACKGROUNDS
): Promise<void> {
	await t.run(async (ctx) => {
		for (const [order, row] of rows.entries()) {
			await ctx.db.insert("quote_backgrounds", {
				active: true,
				ink: row.key === "poster" ? "dark" : "light",
				kind: "still",
				name: row.key,
				order,
				plus: false,
				updatedAt: 0,
				...row,
			});
		}
	});
}
