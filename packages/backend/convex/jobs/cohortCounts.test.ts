import { describe, expect, it } from "vitest";
import type { MutationCtx } from "../_generated/server";
import { weekStartUtc } from "../lib/cohortCard";
import { computeCohortCounts } from "./cohortCounts";

const WEEK_OF = Date.UTC(2026, 0, 7); // a Wednesday

/** Minimal ctx: emotional_metadata rows in, writes recorded. */
function fakeCtx(rowCount: number) {
	const writes: unknown[] = [];
	const rows = Array.from({ length: rowCount }, (_, i) => ({
		createdAt: weekStartUtc(WEEK_OF) + i,
		emotionalProfileId: `p${i}`,
		primaryEmotion: "sadness",
	}));
	const ctx = {
		db: {
			insert: (table: string, doc: unknown) => {
				writes.push({ doc, table });
				return Promise.resolve("id");
			},
			query: (table: string) => ({
				withIndex: () => ({
					take: (n: number) => Promise.resolve(rows.slice(0, n)),
					unique: () => Promise.resolve(null),
				}),
			}),
			replace: (_id: unknown, doc: unknown) => {
				writes.push({ doc, table: "replace" });
				return Promise.resolve();
			},
		},
	} as unknown as MutationCtx;
	return { ctx, writes };
}

describe("computeCohortCounts", () => {
	it("persists counts under the cap", async () => {
		const { ctx, writes } = fakeCtx(3);
		const result = await computeCohortCounts(ctx, { weekOf: WEEK_OF });
		expect(result.saturated).toBe(false);
		expect(result.counts.sadness).toBe(3);
		expect(writes).toHaveLength(1);
	});

	it("writes nothing when the scan saturates", async () => {
		const { ctx, writes } = fakeCtx(8001);
		const result = await computeCohortCounts(ctx, { weekOf: WEEK_OF });
		expect(result.saturated).toBe(true);
		expect(result.counts).toEqual({});
		expect(writes).toHaveLength(0);
	});
});
