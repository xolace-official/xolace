// @vitest-environment edge-runtime
/**
 * `getActive` (B2): bounded and validated, answering the same shape at the
 * old path (`monthlyEvents:getActive`, still called by shipped builds) and
 * the new one. The upload → `imageUrl` handout is in admin/monthlyEvents.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { MAX_EVENTS } from "./events";

vi.mock("../lib/aggregates", () => aggregatesMock());

const pad = (n: number) => String(n).padStart(2, "0");

function addEvent(user: SeededUser, endDate: string, slug = endDate) {
	return user.root.run((ctx) =>
		ctx.db.insert("monthlyEvents", {
			body: "Body",
			editedBy: "user_admin_1",
			endDate,
			priority: 1,
			slug,
			startDate: endDate,
			title: slug,
		})
	);
}

describe("monthlyEvents/events.getActive", () => {
	it("answers the same at the old and the new path", async () => {
		const user = await asNewUser();
		await addEvent(user, "2026-06-30");
		const old = await user.t.query(api.monthlyEvents.getActive, {});
		const next = await user.t.query(api.monthlyEvents.events.getActive, {});
		expect(next).toEqual(old);
		expect(old).toHaveLength(1);
	});

	it("never hands a user the admin who edited the event", async () => {
		const user = await asNewUser();
		await addEvent(user, "2026-06-30");
		const [event] = await user.t.query(api.monthlyEvents.events.getActive, {});
		expect(event).toMatchObject({ endDate: "2026-06-30", title: "2026-06-30" });
		expect(event).not.toHaveProperty("editedBy");
		expect(event).not.toHaveProperty("imageStorageId");
	});

	it("answers a row with every schema field, handing out only the app's", async () => {
		const user = await asNewUser();
		const eventId = await user.root.run(async (ctx) => {
			const imageStorageId = await ctx.storage.store(
				new Blob(["img"], { type: "image/webp" })
			);
			// Every field of `monthlyEvents` in schema.ts. A new column belongs
			// here too, and in `toAppEvent` only if users should see it.
			return ctx.db.insert("monthlyEvents", {
				body: "Body",
				ctaLabel: "Find support",
				ctaRoute: "/(protected)/crisis-resources",
				editedBy: "user_admin_1",
				endDate: "2026-06-30",
				imageStorageId,
				imageUrl: "https://example.com/old.webp",
				linkUrl: "https://example.com/article",
				priority: 1,
				sessionPrompt: "What have you been carrying?",
				slug: "june-2026",
				startDate: "2026-06-01",
				title: "This month",
				updatedAt: 1,
			});
		});
		const [event] = await user.t.query(api.monthlyEvents.events.getActive, {});
		expect(Object.keys(event ?? {}).sort()).toEqual([
			"_creationTime",
			"_id",
			"body",
			"ctaLabel",
			"ctaRoute",
			"endDate",
			"imageUrl",
			"linkUrl",
			"priority",
			"sessionPrompt",
			"slug",
			"startDate",
			"title",
			"updatedAt",
		]);
		expect(event?._id).toBe(eventId);
		// The upload wins over the stored URL.
		expect(event?.imageUrl).not.toBe("https://example.com/old.webp");
	});

	it("leaves unset optional fields out", async () => {
		const user = await asNewUser();
		await addEvent(user, "2026-06-30");
		const [event] = await user.t.query(api.monthlyEvents.events.getActive, {});
		for (const key of ["ctaLabel", "imageUrl", "linkUrl", "sessionPrompt"]) {
			expect(event).not.toHaveProperty(key);
		}
	});

	it("returns the latest-ending events, at most MAX_EVENTS", async () => {
		const user = await asNewUser();
		// Monthly events for five years: the oldest drop off.
		for (let i = 0; i < MAX_EVENTS + 10; i++) {
			const year = 2022 + Math.floor(i / 12);
			await addEvent(user, `${year}-${pad((i % 12) + 1)}-28`);
		}
		const events = await user.t.query(api.monthlyEvents.events.getActive, {});
		expect(events).toHaveLength(MAX_EVENTS);
		const ends = events.map((e) => e.endDate);
		expect(ends[0]).toBe("2026-12-28");
		expect(ends).not.toContain("2022-01-28");
	});

	it("needs a signed-in user", async () => {
		await expect(
			asUnauthed().query(api.monthlyEvents.events.getActive, {})
		).rejects.toThrow(/Not authenticated/);
	});
});
