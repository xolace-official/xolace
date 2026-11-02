// @vitest-environment edge-runtime
/**
 * Awareness events from the admin: the editor's rules are re-checked here,
 * an upload replaces (and deletes) the previous one, and the app's
 * `getActive` hands an upload out as `imageUrl`.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asNewUser, asUnauthed } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const EVENT = {
	body: "June holds space for something that often goes unspoken.",
	endDate: "2026-06-30",
	priority: 1,
	startDate: "2026-06-01",
	title: "Men's Mental Health Month",
};

function storeImage(t: ReturnType<typeof asAdmin>): Promise<Id<"_storage">> {
	return t.run((ctx) =>
		ctx.storage.store(new Blob(["img"], { type: "image/webp" }))
	);
}

describe("admin/monthlyEvents", () => {
	it("creates an event with an upload the app reads as imageUrl", async () => {
		const root = asUnauthed();
		const t = asAdmin(1, root);
		const imageStorageId = await storeImage(t);
		await t.mutation(api.admin.monthlyEvents.create, {
			...EVENT,
			ctaLabel: "",
			imageStorageId,
			slug: "mens-mental-health-month-2026",
		});

		const [row] = await t.query(api.admin.monthlyEvents.list, {});
		expect(row).not.toHaveProperty("ctaLabel");
		expect(row).toMatchObject({
			hasUpload: true,
			slug: "mens-mental-health-month-2026",
		});
		expect(row?.imageUrl).toMatch(/^https?:\/\//);

		const { t: user } = await asNewUser(2, root);
		const [active] = await user.query(api.monthlyEvents.getActive, {});
		expect(active?.imageUrl).toBe(row?.imageUrl);
	});

	it("rejects what the editor would have blocked", async () => {
		const t = asAdmin();
		const slug = "x";
		await expect(
			t.mutation(api.admin.monthlyEvents.create, {
				...EVENT,
				endDate: "2026-05-31",
				slug,
			})
		).rejects.toThrow(/before the start date/);
		await expect(
			t.mutation(api.admin.monthlyEvents.create, {
				...EVENT,
				ctaLabel: "Find support",
				slug,
			})
		).rejects.toThrow(/label and a destination/);
		await expect(
			t.mutation(api.admin.monthlyEvents.create, {
				...EVENT,
				ctaLabel: "Go",
				ctaRoute: "/(protected)/somewhere",
				slug,
			})
		).rejects.toThrow(/can't open/);
	});

	it("deletes the replaced upload, and the last one with the event", async () => {
		const t = asAdmin();
		const first = await storeImage(t);
		await t.mutation(api.admin.monthlyEvents.create, {
			...EVENT,
			imageStorageId: first,
			slug: "e",
		});
		const second = await storeImage(t);
		await t.mutation(api.admin.monthlyEvents.setImage, {
			imageStorageId: second,
			slug: "e",
		});
		expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeNull();

		await t.mutation(api.admin.monthlyEvents.remove, { slug: "e" });
		expect(await t.run((ctx) => ctx.storage.getUrl(second))).toBeNull();
		expect(await t.query(api.admin.monthlyEvents.list, {})).toEqual([]);
	});
});
